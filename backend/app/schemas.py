from datetime import datetime
import re
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BusinessCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    currency: str = Field(default="INR", min_length=3, max_length=3, pattern="^[A-Z]{3}$")
    timezone: str = Field(default="Asia/Kolkata", max_length=64)

    @field_validator("timezone")
    @classmethod
    def timezone_must_be_valid(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError:
            raise ValueError("timezone must be a valid IANA timezone") from None
        return value


class BusinessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    currency: str
    timezone: str


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    business_name: str | None = Field(default=None, min_length=1, max_length=160)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str


class MembershipOut(BaseModel):
    business: BusinessOut
    role: str


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut
    memberships: list[MembershipOut]


class RegistrationOut(BaseModel):
    message: str
    delivery_status: Literal["sent", "manual", "failed"]
    verification_url: str | None = None


class EmailVerificationRequest(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class AccountOut(BaseModel):
    user: UserOut
    memberships: list[MembershipOut]


class MemberCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: str = Field(pattern="^(admin|sales|viewer)$")


class MemberOut(BaseModel):
    user: UserOut
    role: str


class InvitationCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: str = Field(pattern="^(admin|sales|viewer)$")


class InvitationCreated(BaseModel):
    id: int
    business_id: int
    email: str
    role: str
    token: str | None = None
    invitation_url: str | None = None
    expires_at: datetime
    delivery_status: Literal["sent", "manual", "failed"]


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    email: str
    role: str
    expires_at: datetime
    accepted_at: datetime | None


class InvitationAccept(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=32)


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("name", "email", "phone", mode="before")
    @classmethod
    def strip_update_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("name")
    @classmethod
    def update_name_not_blank(cls, value: str | None) -> str | None:
        if value is None or value == "":
            raise ValueError("name cannot be blank")
        return value

    @field_validator("email")
    @classmethod
    def update_email_valid(cls, value: str | None) -> str | None:
        if value == "":
            return None
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("email must be a valid email address")
        return value.lower() if value else value


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    name: str
    email: str | None
    phone: str | None


class CustomerImportItem(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("name", "email", "phone", mode="before")
    @classmethod
    def strip_optional_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("name cannot be blank")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value == "":
            return None
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("email must be a valid email address")
        return value.lower() if value else value


class CustomerImportRequest(BaseModel):
    rows: list[CustomerImportItem] = Field(min_length=1, max_length=500)


class ProductImportItem(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sku: str = Field(min_length=1, max_length=64)
    price_minor: int = Field(ge=0, le=2_147_483_647)
    stock_quantity: int = Field(default=0, ge=0, le=2_147_483_647)

    @field_validator("name", "sku", mode="before")
    @classmethod
    def strip_required_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class ProductImportRequest(BaseModel):
    rows: list[ProductImportItem] = Field(min_length=1, max_length=500)


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sku: str = Field(min_length=1, max_length=64)
    price_minor: int = Field(ge=0)
    stock_quantity: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    sku: str | None = Field(default=None, min_length=1, max_length=64)
    price_minor: int | None = Field(default=None, ge=0, le=2_147_483_647)
    stock_quantity: int | None = Field(default=None, ge=0, le=2_147_483_647)
    active: bool | None = None

    @field_validator("name", "sku", mode="before")
    @classmethod
    def strip_product_update_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("name", "sku")
    @classmethod
    def product_update_text_not_blank(cls, value: str | None) -> str | None:
        if value is None or value == "":
            raise ValueError("value cannot be blank")
        return value

    @field_validator("active")
    @classmethod
    def product_active_not_null(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError("active must be true or false")
        return value


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    name: str
    sku: str
    price_minor: int
    stock_quantity: int
    active: bool


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    customer_id: int | None = None
    items: list[SaleItemCreate] = Field(min_length=1)


class SaleImportItem(BaseModel):
    sale_ref: str = Field(min_length=1, max_length=128)
    sold_at: datetime
    customer_email: str | None = Field(default=None, max_length=254)
    sku: str = Field(min_length=1, max_length=64)
    quantity: int = Field(gt=0, le=2_147_483_647)
    unit_price_minor: int = Field(ge=0, le=2_147_483_647)

    @field_validator("sale_ref", "sku", "customer_email", mode="before")
    @classmethod
    def strip_import_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("sold_at")
    @classmethod
    def sale_date_requires_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("sold_at must include a timezone, such as Z or +05:30")
        return value

    @field_validator("customer_email")
    @classmethod
    def normalize_import_email(cls, value: str | None) -> str | None:
        if value == "":
            return None
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("customer_email must be a valid email address")
        return value.lower() if value else value


class SaleImportRequest(BaseModel):
    rows: list[SaleImportItem] = Field(min_length=1, max_length=500)


class SaleCorrectionItem(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=2_147_483_647)
    unit_price_minor: int = Field(ge=0, le=2_147_483_647)


class SaleCorrection(BaseModel):
    customer_id: int | None = None
    items: list[SaleCorrectionItem] = Field(min_length=1, max_length=100)


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int | None
    product_name: str
    quantity: int
    unit_price_minor: int


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    customer_id: int | None
    total_minor: int
    currency: str
    external_reference: str | None = None
    created_at: datetime
    items: list[SaleItemOut]
