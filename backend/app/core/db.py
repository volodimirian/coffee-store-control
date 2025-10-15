"""DB connection setup (SQLAlchemy + async)."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# Create SQLAlchemy engine
engine = create_async_engine(settings.database_url, echo=settings.db_echo, future=True)
print("DB URL =", settings.database_url)

# Session factory
async_session_maker = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)

# FastAPI dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
