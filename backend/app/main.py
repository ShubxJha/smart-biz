import hashlib
import csv
from io import StringIO
import secrets
from datetime import date, datetime, time, timedelta, timezone
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app import models, schemas
from app.auth import ACCESS_TOKEN_TTL, create_access_token, decode_access_token, get_business_membership, get_current_user, hash_password, verify_password

app = FastAPI(
    title="SmartBiz API",
    description="Sales management and business analytics for small businesses.",
    version="0.4.0",
)


def require_membership(
    x_business_id: int | None = Header(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.BusinessMembership:
    return get_business_membership(x_business_id, current_user, db)


def require_business(membership: models.BusinessMembership = Depends(require_membership)) -> models.Business:
    return membership.business


def require_roles(*allowed: str):
    def check_role(membership: models.BusinessMembership = Depends(require_membership)) -> models.BusinessMembership:
        if membership.role not in allowed:
            raise HTTPException(status_code=403, detail="Your business role cannot perform this action")
        return membership
    return check_role


def auth_response(user: models.User, db: Session) -> dict:
    memberships = db.scalars(
        select(models.BusinessMembership)
        .options(selectinload(models.BusinessMembership.business))
        .where(models.BusinessMembership.user_id == user.id)
    ).all()
    return {
        "access_token": create_access_token(user.id),
        "expires_in": int(ACCESS_TOKEN_TTL.total_seconds()),
        "user": user,
        "memberships": [{"business": membership.business, "role": membership.role} for membership in memberships],
    }


def reporting_window(
    business: models.Business,
    from_date: date | None,
    to_date: date | None,
) -> tuple[datetime, datetime, date, date, ZoneInfo]:
    try:
        business_zone = ZoneInfo(business.timezone)
    except ZoneInfoNotFoundError:
        raise HTTPException(status_code=422, detail="Business timezone is not a valid IANA timezone") from None
    local_today = datetime.now(business_zone).date()
    end_day = to_date or local_today
    if end_day == date.max:
        raise HTTPException(status_code=422, detail="to_date is outside the supported range")
    try:
        start_day = from_date or end_day - timedelta(days=29)
    except OverflowError:
        raise HTTPException(status_code=422, detail="to_date is outside the supported range") from None
    if start_day > end_day:
        raise HTTPException(status_code=422, detail="from_date must be on or before to_date")
    if (end_day - start_day).days > 365:
        raise HTTPException(status_code=422, detail="Date range cannot exceed 366 calendar days")
    start_utc = datetime.combine(start_day, time.min, tzinfo=business_zone).astimezone(timezone.utc)
    end_utc = datetime.combine(end_day + timedelta(days=1), time.min, tzinfo=business_zone).astimezone(timezone.utc)
    return start_utc, end_utc, start_day, end_day, business_zone


def report_buckets(interval: str, start_day: date, end_day: date) -> list[date]:
    if interval == "day":
        return [start_day + timedelta(days=offset) for offset in range((end_day - start_day).days + 1)]
    if interval == "week":
        first = start_day - timedelta(days=start_day.weekday())
        buckets: list[date] = []
        current = first
        while current <= end_day:
            buckets.append(current)
            current += timedelta(days=7)
        return buckets
    current = start_day.replace(day=1)
    buckets = []
    while current <= end_day:
        buckets.append(current)
        if current.year == end_day.year and current.month == end_day.month:
            break
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    return buckets


def csv_safe(value: object) -> str:
    result = str(value)
    if result.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + result
    return result


@app.get("/health", tags=["operations"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/auth/register", response_model=schemas.AuthOut, status_code=201, tags=["authentication"])
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = models.User(email=email, full_name=payload.full_name.strip(), password_hash=hash_password(payload.password))
    if payload.business_name is not None:
        business = models.Business(name=payload.business_name.strip())
        user.memberships.append(models.BusinessMembership(business=business, role="owner"))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists") from None
    db.refresh(user)
    return auth_response(user, db)


@app.post("/api/v1/auth/login", response_model=schemas.AuthOut, tags=["authentication"])
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.email == payload.email.strip().lower()))
    if user is None or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    return auth_response(user, db)


@app.get("/api/v1/auth/me", response_model=schemas.AccountOut, tags=["authentication"])
def current_account(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.scalars(
        select(models.BusinessMembership)
        .options(selectinload(models.BusinessMembership.business))
        .where(models.BusinessMembership.user_id == current_user.id)
    ).all()
    return {"user": current_user, "memberships": [{"business": item.business, "role": item.role} for item in memberships]}


@app.post("/api/v1/auth/logout", tags=["authentication"])
def logout(
    payload: dict = Depends(decode_access_token),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    db.execute(delete(models.TokenRevocation).where(models.TokenRevocation.expires_at <= now))
    db.add(models.TokenRevocation(
        token_id=payload["jti"],
        user_id=current_user.id,
        expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
    ))
    db.commit()
    return {"status": "logged_out"}


@app.post("/api/v1/businesses", response_model=schemas.BusinessOut, status_code=201, tags=["businesses"])
def create_business(payload: schemas.BusinessCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = models.Business(**payload.model_dump())
    db.add(business)
    db.flush()
    db.add(models.BusinessMembership(user_id=current_user.id, business_id=business.id, role="owner"))
    db.commit()
    db.refresh(business)
    return business


@app.get("/api/v1/businesses", response_model=list[schemas.MembershipOut], tags=["businesses"])
def list_businesses(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.scalars(
        select(models.BusinessMembership)
        .options(selectinload(models.BusinessMembership.business))
        .where(models.BusinessMembership.user_id == current_user.id)
    ).all()
    return [{"business": item.business, "role": item.role} for item in memberships]


@app.post("/api/v1/businesses/members", response_model=schemas.MemberOut, status_code=201, tags=["businesses"])
def add_business_member(
    payload: schemas.MemberCreate,
    membership: models.BusinessMembership = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    if payload.role == "admin" and membership.role != "owner":
        raise HTTPException(status_code=403, detail="Only the business owner can grant the admin role")
    user = db.scalar(select(models.User).where(models.User.email == payload.email.strip().lower()))
    if user is None:
        raise HTTPException(status_code=404, detail="Create the user's SmartBiz account before adding them")
    new_membership = models.BusinessMembership(business_id=membership.business_id, user_id=user.id, role=payload.role)
    db.add(new_membership)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This user is already a member of the business") from None
    return {"user": user, "role": new_membership.role}


@app.get("/api/v1/businesses/members", response_model=list[schemas.MemberOut], tags=["businesses"])
def list_business_members(membership: models.BusinessMembership = Depends(require_membership), db: Session = Depends(get_db)):
    records = db.scalars(
        select(models.BusinessMembership)
        .options(selectinload(models.BusinessMembership.user))
        .where(models.BusinessMembership.business_id == membership.business_id)
        .order_by(models.BusinessMembership.id)
    ).all()
    return [{"user": item.user, "role": item.role} for item in records]


@app.delete("/api/v1/businesses/members/{user_id}", status_code=204, tags=["businesses"])
def remove_business_member(
    user_id: int,
    membership: models.BusinessMembership = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    target = db.scalar(select(models.BusinessMembership).where(
        models.BusinessMembership.business_id == membership.business_id,
        models.BusinessMembership.user_id == user_id,
    ))
    if target is None:
        raise HTTPException(status_code=404, detail="Business member not found")
    if target.role == "owner":
        raise HTTPException(status_code=409, detail="Owners cannot be removed through this endpoint")
    if membership.role == "admin" and target.role != "viewer" and target.role != "sales":
        raise HTTPException(status_code=403, detail="Admins can only remove sales and viewer members")
    db.delete(target)
    db.commit()
    return Response(status_code=204)


@app.post("/api/v1/businesses/invitations", response_model=schemas.InvitationCreated, status_code=201, tags=["businesses"])
def create_business_invitation(
    payload: schemas.InvitationCreate,
    membership: models.BusinessMembership = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    if payload.role == "admin" and membership.role != "owner":
        raise HTTPException(status_code=403, detail="Only the business owner can grant the admin role")
    email = payload.email.strip().lower()
    existing_member = db.scalar(
        select(models.BusinessMembership)
        .join(models.User)
        .where(models.BusinessMembership.business_id == membership.business_id, models.User.email == email)
    )
    if existing_member is not None:
        raise HTTPException(status_code=409, detail="This user is already a business member")
    now = datetime.now(timezone.utc)
    existing_invitation = db.scalar(select(models.BusinessInvitation).where(
        models.BusinessInvitation.business_id == membership.business_id,
        models.BusinessInvitation.email == email,
        models.BusinessInvitation.accepted_at.is_(None),
        models.BusinessInvitation.expires_at > now,
    ))
    if existing_invitation is not None:
        raise HTTPException(status_code=409, detail="A pending invitation already exists for this email")
    token = secrets.token_urlsafe(32)
    invitation = models.BusinessInvitation(
        business_id=membership.business_id,
        invited_by_user_id=membership.user_id,
        email=email,
        role=payload.role,
        token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
        expires_at=now + timedelta(days=7),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return {
        "id": invitation.id,
        "business_id": invitation.business_id,
        "email": invitation.email,
        "role": invitation.role,
        "token": token,
        "expires_at": invitation.expires_at,
    }


@app.get("/api/v1/businesses/invitations", response_model=list[schemas.InvitationOut], tags=["businesses"])
def list_business_invitations(
    membership: models.BusinessMembership = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    return db.scalars(select(models.BusinessInvitation).where(
        models.BusinessInvitation.business_id == membership.business_id,
        models.BusinessInvitation.accepted_at.is_(None),
        models.BusinessInvitation.expires_at > datetime.now(timezone.utc),
    ).order_by(models.BusinessInvitation.created_at.desc())).all()


@app.delete("/api/v1/businesses/invitations/{invitation_id}", status_code=204, tags=["businesses"])
def revoke_business_invitation(
    invitation_id: int,
    membership: models.BusinessMembership = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    invitation = db.scalar(select(models.BusinessInvitation).where(
        models.BusinessInvitation.id == invitation_id,
        models.BusinessInvitation.business_id == membership.business_id,
        models.BusinessInvitation.accepted_at.is_(None),
    ))
    if invitation is None:
        raise HTTPException(status_code=404, detail="Pending invitation not found")
    if membership.role == "admin" and invitation.role == "admin":
        raise HTTPException(status_code=403, detail="Admins cannot revoke admin invitations")
    db.delete(invitation)
    db.commit()
    return Response(status_code=204)


@app.post("/api/v1/auth/invitations/accept", response_model=schemas.MembershipOut, tags=["authentication"])
def accept_business_invitation(
    payload: schemas.InvitationAccept,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()
    invitation = db.scalar(select(models.BusinessInvitation).where(
        models.BusinessInvitation.token_hash == token_hash,
    ).with_for_update())
    if invitation is None or invitation.accepted_at is not None:
        raise HTTPException(status_code=404, detail="Invitation is invalid or already used")
    if invitation.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation has expired")
    if invitation.email != current_user.email:
        raise HTTPException(status_code=403, detail="Sign in with the email address the invitation was sent to")
    already_member = db.scalar(select(models.BusinessMembership).where(
        models.BusinessMembership.business_id == invitation.business_id,
        models.BusinessMembership.user_id == current_user.id,
    ))
    if already_member is not None:
        raise HTTPException(status_code=409, detail="You are already a member of this business")
    invitation.accepted_at = datetime.now(timezone.utc)
    membership = models.BusinessMembership(
        business_id=invitation.business_id,
        user_id=current_user.id,
        role=invitation.role,
    )
    db.add(membership)
    db.commit()
    business = db.get(models.Business, invitation.business_id)
    return {"business": business, "role": membership.role}


@app.post("/api/v1/customers", response_model=schemas.CustomerOut, status_code=201, tags=["customers"])
def create_customer(payload: schemas.CustomerCreate, business: models.Business = Depends(require_business), _role: models.BusinessMembership = Depends(require_roles("owner", "admin", "sales")), db: Session = Depends(get_db)):
    customer = models.Customer(business_id=business.id, **payload.model_dump())
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A customer with this email already exists") from None
    db.refresh(customer)
    return customer


@app.get("/api/v1/customers", response_model=list[schemas.CustomerOut], tags=["customers"])
def list_customers(business: models.Business = Depends(require_business), db: Session = Depends(get_db)):
    return db.scalars(select(models.Customer).where(models.Customer.business_id == business.id).order_by(models.Customer.name)).all()


@app.post("/api/v1/products", response_model=schemas.ProductOut, status_code=201, tags=["products"])
def create_product(payload: schemas.ProductCreate, business: models.Business = Depends(require_business), _role: models.BusinessMembership = Depends(require_roles("owner", "admin")), db: Session = Depends(get_db)):
    product = models.Product(business_id=business.id, **payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A product with this SKU already exists") from None
    db.refresh(product)
    return product


@app.get("/api/v1/products", response_model=list[schemas.ProductOut], tags=["products"])
def list_products(business: models.Business = Depends(require_business), db: Session = Depends(get_db)):
    return db.scalars(select(models.Product).where(models.Product.business_id == business.id).order_by(models.Product.name)).all()


@app.post("/api/v1/sales", response_model=schemas.SaleOut, status_code=201, tags=["sales"])
def create_sale(payload: schemas.SaleCreate, business: models.Business = Depends(require_business), _role: models.BusinessMembership = Depends(require_roles("owner", "admin", "sales")), db: Session = Depends(get_db)):
    quantities: dict[int, int] = {}
    for item in payload.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity

    if payload.customer_id is not None:
        customer = db.scalar(select(models.Customer).where(
            models.Customer.id == payload.customer_id,
            models.Customer.business_id == business.id,
        ))
        if customer is None:
            raise HTTPException(status_code=404, detail="Customer not found in this business")

    products = db.scalars(
        select(models.Product)
        .where(models.Product.id.in_(quantities), models.Product.business_id == business.id)
        .order_by(models.Product.id)
        .with_for_update()
    ).all()
    product_by_id = {product.id: product for product in products}
    if len(product_by_id) != len(quantities):
        raise HTTPException(status_code=404, detail="One or more products were not found in this business")
    for product_id, quantity in quantities.items():
        product = product_by_id[product_id]
        if not product.active:
            raise HTTPException(status_code=409, detail=f"Product {product.name} is inactive")
        if product.stock_quantity < quantity:
            raise HTTPException(status_code=409, detail=f"Insufficient stock for {product.name}")

    sale = models.Sale(business_id=business.id, customer_id=payload.customer_id, total_minor=0, currency=business.currency)
    for product_id, quantity in quantities.items():
        product = product_by_id[product_id]
        product.stock_quantity -= quantity
        sale.items.append(models.SaleItem(
            product_id=product.id,
            product_name=product.name,
            quantity=quantity,
            unit_price_minor=product.price_minor,
        ))
        sale.total_minor += product.price_minor * quantity
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


@app.get("/api/v1/sales", response_model=list[schemas.SaleOut], tags=["sales"])
def list_sales(
    from_date: date | None = None,
    to_date: date | None = None,
    customer_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    business: models.Business = Depends(require_business),
    db: Session = Depends(get_db),
):
    start_utc, end_utc, _, _, _ = reporting_window(business, from_date, to_date)
    statement = (
        select(models.Sale)
        .options(selectinload(models.Sale.items))
        .where(
            models.Sale.business_id == business.id,
            models.Sale.created_at >= start_utc,
            models.Sale.created_at < end_utc,
        )
        .order_by(models.Sale.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if customer_id is not None:
        statement = statement.where(models.Sale.customer_id == customer_id)
    return db.scalars(statement).all()


@app.get("/api/v1/dashboard/summary", tags=["analytics"])
def dashboard_summary(
    from_date: date | None = None,
    to_date: date | None = None,
    business: models.Business = Depends(require_business),
    db: Session = Depends(get_db),
):
    start_utc, end_utc, start_day, end_day, _ = reporting_window(business, from_date, to_date)
    count, revenue = db.execute(
        select(func.count(models.Sale.id), func.coalesce(func.sum(models.Sale.total_minor), 0))
        .where(
            models.Sale.business_id == business.id,
            models.Sale.created_at >= start_utc,
            models.Sale.created_at < end_utc,
        )
    ).one()
    return {
        "business_id": business.id,
        "currency": business.currency,
        "from_date": start_day,
        "to_date": end_day,
        "order_count": count,
        "revenue_minor": revenue,
        "average_order_value_minor": round(revenue / count) if count else 0,
    }


@app.get("/api/v1/analytics/sales-trend", tags=["analytics"])
def sales_trend(
    from_date: date | None = None,
    to_date: date | None = None,
    interval: Literal["day", "week", "month"] = "day",
    business: models.Business = Depends(require_business),
    db: Session = Depends(get_db),
):
    start_utc, end_utc, start_day, end_day, _ = reporting_window(business, from_date, to_date)
    local_created_at = func.timezone(business.timezone, models.Sale.created_at)
    bucket_expr = func.date_trunc(interval, local_created_at)
    rows = db.execute(
        select(
            bucket_expr.label("bucket"),
            func.count(models.Sale.id).label("order_count"),
            func.coalesce(func.sum(models.Sale.total_minor), 0).label("revenue_minor"),
        )
        .where(
            models.Sale.business_id == business.id,
            models.Sale.created_at >= start_utc,
            models.Sale.created_at < end_utc,
        )
        .group_by(bucket_expr)
        .order_by(bucket_expr)
    ).all()
    values = {row.bucket.date(): (row.order_count, row.revenue_minor) for row in rows}
    buckets = []
    for bucket_day in report_buckets(interval, start_day, end_day):
        count, revenue = values.get(bucket_day, (0, 0))
        buckets.append({
            "bucket_start": bucket_day,
            "order_count": count,
            "revenue_minor": revenue,
            "average_order_value_minor": round(revenue / count) if count else 0,
        })
    return {
        "business_id": business.id,
        "currency": business.currency,
        "interval": interval,
        "from_date": start_day,
        "to_date": end_day,
        "buckets": buckets,
    }


@app.get("/api/v1/analytics/top-products", tags=["analytics"])
def top_products(
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = Query(default=10, ge=1, le=100),
    business: models.Business = Depends(require_business),
    db: Session = Depends(get_db),
):
    start_utc, end_utc, start_day, end_day, _ = reporting_window(business, from_date, to_date)
    rows = db.execute(
        select(
            models.SaleItem.product_name,
            func.sum(models.SaleItem.quantity).label("units_sold"),
            func.sum(models.SaleItem.quantity * models.SaleItem.unit_price_minor).label("revenue_minor"),
        )
        .join(models.Sale, models.Sale.id == models.SaleItem.sale_id)
        .where(
            models.Sale.business_id == business.id,
            models.Sale.created_at >= start_utc,
            models.Sale.created_at < end_utc,
        )
        .group_by(models.SaleItem.product_name)
        .order_by(func.sum(models.SaleItem.quantity).desc(), models.SaleItem.product_name)
        .limit(limit)
    ).all()
    return {
        "business_id": business.id,
        "currency": business.currency,
        "from_date": start_day,
        "to_date": end_day,
        "products": [
            {"product_name": row.product_name, "units_sold": row.units_sold, "revenue_minor": row.revenue_minor}
            for row in rows
        ],
    }


@app.get("/api/v1/reports/sales.csv", tags=["reports"])
def export_sales_csv(
    from_date: date | None = None,
    to_date: date | None = None,
    business: models.Business = Depends(require_business),
    db: Session = Depends(get_db),
):
    start_utc, end_utc, start_day, end_day, business_zone = reporting_window(business, from_date, to_date)
    sales = db.scalars(
        select(models.Sale)
        .options(selectinload(models.Sale.items))
        .where(
            models.Sale.business_id == business.id,
            models.Sale.created_at >= start_utc,
            models.Sale.created_at < end_utc,
        )
        .order_by(models.Sale.created_at)
        .limit(50001)
    ).all()
    if len(sales) > 50000:
        raise HTTPException(status_code=413, detail="Export exceeds 50,000 sales; narrow the date range")
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow([
        "sale_id", "sold_at_local", "customer_id", "total_minor", "currency",
        "product_id", "product_name", "quantity", "unit_price_minor", "line_total_minor",
    ])
    for sale in sales:
        sold_at = sale.created_at.astimezone(business_zone).isoformat()
        for item in sale.items:
            writer.writerow([
                sale.id,
                sold_at,
                sale.customer_id or "",
                sale.total_minor,
                csv_safe(sale.currency),
                item.product_id or "",
                csv_safe(item.product_name),
                item.quantity,
                item.unit_price_minor,
                item.quantity * item.unit_price_minor,
            ])
    filename = f"sales-{start_day.isoformat()}-to-{end_day.isoformat()}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
