from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app import models, schemas
from app.auth import ACCESS_TOKEN_TTL, create_access_token, get_business_membership, get_current_user, hash_password, verify_password

app = FastAPI(
    title="SmartBiz API",
    description="Sales management and business analytics for small businesses.",
    version="0.2.0",
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


@app.get("/health", tags=["operations"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/auth/register", response_model=schemas.AuthOut, status_code=201, tags=["authentication"])
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = models.User(email=email, full_name=payload.full_name.strip(), password_hash=hash_password(payload.password))
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
def list_sales(business: models.Business = Depends(require_business), db: Session = Depends(get_db)):
    statement = (
        select(models.Sale)
        .options(selectinload(models.Sale.items))
        .where(models.Sale.business_id == business.id)
        .order_by(models.Sale.created_at.desc())
        .limit(100)
    )
    return db.scalars(statement).all()


@app.get("/api/v1/dashboard/summary", tags=["analytics"])
def dashboard_summary(business: models.Business = Depends(require_business), db: Session = Depends(get_db)):
    count, revenue = db.execute(
        select(func.count(models.Sale.id), func.coalesce(func.sum(models.Sale.total_minor), 0))
        .where(models.Sale.business_id == business.id)
    ).one()
    return {
        "business_id": business.id,
        "currency": business.currency,
        "order_count": count,
        "revenue_minor": revenue,
        "average_order_value_minor": round(revenue / count) if count else 0,
    }
