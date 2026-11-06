import os

from sqlalchemy import URL, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker


database_url = os.getenv("DATABASE_URL")
if database_url:
    parsed_database_url = make_url(database_url)
    if parsed_database_url.drivername in {"postgres", "postgresql"}:
        parsed_database_url = parsed_database_url.set(drivername="postgresql+psycopg")
    DATABASE_URL = parsed_database_url
else:
    DATABASE_URL = URL.create(
        drivername="postgresql+psycopg",
        username=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "smartbiz"),
    )
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
