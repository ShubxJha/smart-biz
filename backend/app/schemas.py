from datetime import datetime
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
    token: str
    expires_at: datetime


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


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    name: str
    email: str | None
    phone: str | None


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sku: str = Field(min_length=1, max_length=64)
    price_minor: int = Field(ge=0)
    stock_quantity: int = Field(default=0, ge=0)


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
    created_at: datetime
    items: list[SaleItemOut]
