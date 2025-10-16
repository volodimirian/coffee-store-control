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
from app.core_models import User, Role, Permission, UserRole
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
        # Create default roles and permissions
        from app.core_models import Role, Permission, UserRole
        
        # Create roles
        roles_to_create = [
            Role(name=UserRole.ADMIN.value, description="System administrator"),
            Role(name=UserRole.BUSINESS_OWNER.value, description="Business owner"),
            Role(name=UserRole.EMPLOYEE.value, description="Employee"),
        ]
        
        for role in roles_to_create:
            session.add(role)
        
        # Create sample permissions
        permissions_to_create = [
            Permission(name="VIEW_DATA", description="View data", resource="data", action="view"),
            Permission(name="EDIT_DATA", description="Edit data", resource="data", action="edit"),
            Permission(name="MANAGE_USERS", description="Manage users", resource="users", action="manage"),
        ]
        
        for permission in permissions_to_create:
            session.add(permission)
        
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
    """Create a test user with EMPLOYEE role."""
    from sqlalchemy import select
    
    # Get existing EMPLOYEE role
    employee_role = await db_session.scalar(select(Role).where(Role.name == UserRole.EMPLOYEE.value))
    assert employee_role is not None, "EMPLOYEE role not found"
    
    user = User(
        email="test@example.com",
        username="testuser",
        password_hash=hash_password("testpassword"),
        role_id=employee_role.id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_business_owner(db_session: AsyncSession) -> User:
    """Create a test business owner user."""
    from sqlalchemy import select
    
    # Get existing BUSINESS_OWNER role
    business_owner_role = await db_session.scalar(select(Role).where(Role.name == UserRole.BUSINESS_OWNER.value))
    assert business_owner_role is not None, "BUSINESS_OWNER role not found"
    
    user = User(
        email="business@example.com",
        username="businessowner",
        password_hash=hash_password("businesspassword"),
        role_id=business_owner_role.id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Create a test admin user."""
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
async def sample_user_with_role(db_session: AsyncSession) -> tuple[User, Role]:
    """Create a sample user with role for testing."""
    from sqlalchemy import select
    
    # Get existing EMPLOYEE role
    role = await db_session.scalar(select(Role).where(Role.name == UserRole.EMPLOYEE.value))
    assert role is not None, "EMPLOYEE role not found"
    
    user = User(
        email="sample@example.com",
        username="sampleuser",
        password_hash=hash_password("samplepassword"),
        role_id=role.id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user, role


@pytest_asyncio.fixture
async def sample_permission(db_session: AsyncSession) -> Permission:
    """Get a sample permission for testing."""
    from sqlalchemy import select
    
    permission = await db_session.scalar(select(Permission).where(Permission.name == "VIEW_DATA"))
    assert permission is not None, "VIEW_DATA permission not found"
    return permission


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
