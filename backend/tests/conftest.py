"""
pytest configuration and shared fixtures.
"""
import os
import asyncio
from typing import AsyncGenerator, Generator
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.db import Base, get_db
from app.users.models import User
from app.core.security import hash_password

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=True if os.getenv("TEST_DB_ECHO") == "true" else False
)

# Test session factory
TestingSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        # Create default roles
        from app.users.models import Role, UserRole
        
        roles_to_create = [
            Role(name=UserRole.BUYER.value, description="Product buyer"),
            Role(name=UserRole.SUPPLIER.value, description="Product supplier"),
            Role(name=UserRole.ADMIN.value, description="System administrator"),
        ]
        
        for role in roles_to_create:
            session.add(role)
        
        await session.commit()
        yield session
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with database dependency override."""
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    from app.users.models import Role, UserRole
    from sqlalchemy import select
    
    # Get existing BUYER role
    buyer_role = await db_session.scalar(select(Role).where(Role.name == UserRole.BUYER.value))
    assert buyer_role is not None, "BUYER role not found"
    
    user = User(
        email="test@example.com",
        username="testuser",
        password_hash=hash_password("testpassword"),
        role_id=buyer_role.id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_supplier(db_session: AsyncSession) -> User:
    """Create a test supplier user."""
    from app.users.models import Role, UserRole
    from sqlalchemy import select
    
    # Get existing SUPPLIER role
    supplier_role = await db_session.scalar(select(Role).where(Role.name == UserRole.SUPPLIER.value))
    assert supplier_role is not None, "SUPPLIER role not found"
    
    user = User(
        email="supplier@example.com",
        username="testsupplier",
        password_hash=hash_password("supplierpassword"),
        role_id=supplier_role.id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    from app.users.models import Role, UserRole
    from sqlalchemy import select
    
    # Get existing ADMIN role
    admin_role = await db_session.scalar(select(Role).where(Role.name == UserRole.ADMIN.value))
    assert admin_role is not None, "ADMIN role not found"
    
    user = User(
        email="admin@example.com",
        username="testadmin",
        password_hash=hash_password("adminpassword"),
        role_id=admin_role.id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def client_with_mongodb(db_session: AsyncSession, mongodb_mock) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with both database and MongoDB dependency overrides."""
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()
