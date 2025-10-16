"""
Tests for authentication endpoints.
"""
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User, Role
from app.core.security import create_access_token


class TestAuthRegistration:
    """Test user registration endpoint."""

    async def test_register_new_user_success(self, client: AsyncClient):
        """Test successful user registration."""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "securepassword123",
            "role": "BUYER"
        }
        
        response = await client.post("/auth/register", json=user_data)
        
        # Debug: print response if test fails
        if response.status_code != 201:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.json()}")
        
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    async def test_register_duplicate_email_fails(self, client: AsyncClient, test_user: User):
        """Test registration with existing email fails."""
        user_data = {
            "email": test_user.email,  # Already exists
            "username": "differentusername",
            "password": "securepassword123",
            "role": "BUYER"
        }

        response = await client.post("/auth/register", json=user_data)

        assert response.status_code == 409
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "EMAIL_ALREADY_EXISTS"

    async def test_register_duplicate_username_fails(self, client: AsyncClient, test_user: User):
        """Test registration with existing username fails."""
        user_data = {
            "email": "different@example.com",
            "username": test_user.username,  # Already exists
            "password": "securepassword123",
            "role": "BUYER"
        }

        response = await client.post("/auth/register", json=user_data)

        assert response.status_code == 409
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "USERNAME_ALREADY_EXISTS"

    async def test_register_invalid_email_format(self, client: AsyncClient):
        """Test registration with invalid email format."""
        user_data = {
            "email": "invalid-email",
            "username": "validusername",
            "password": "securepassword123",
            "role": "BUYER"
        }
        
        response = await client.post("/auth/register", json=user_data)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    async def test_register_short_password(self, client: AsyncClient):
        """Test registration with too short password."""
        user_data = {
            "email": "valid@example.com",
            "username": "validusername",
            "password": "123",  # Too short
            "role": "BUYER"
        }
        
        response = await client.post("/auth/register", json=user_data)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    async def test_register_missing_fields(self, client: AsyncClient):
        """Test registration with missing required fields."""
        user_data = {
            "email": "valid@example.com"
            # Missing username and password
        }
        
        response = await client.post("/auth/register", json=user_data)
        
        assert response.status_code == 422

    async def test_register_invalid_role_in_db(self, client: AsyncClient, db_session: AsyncSession):
        """Test registration when role doesn't exist in database."""
        # First remove all roles to simulate missing role
        await db_session.execute(delete(Role))
        await db_session.commit()
        
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "securepassword123",
            "role": "BUYER"  # Valid enum but not in DB
        }
        
        response = await client.post("/auth/register", json=user_data)
        
        assert response.status_code == 400
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "INVALID_ROLE"


class TestAuthLogin:
    """Test user login endpoint."""

    async def test_login_valid_credentials(self, client: AsyncClient, test_user: User):
        """Test successful login with valid credentials."""
        login_data = {
            "email": test_user.email,
            "password": "testpassword"  # From fixture
        }
        
        response = await client.post("/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    async def test_login_invalid_email(self, client: AsyncClient):
        """Test login with non-existent email."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "somepassword"
        }
        
        response = await client.post("/auth/login", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "INVALID_CREDENTIALS"

    async def test_login_invalid_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password."""
        login_data = {
            "email": test_user.email,
            "password": "wrongpassword"
        }
        
        response = await client.post("/auth/login", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "INVALID_CREDENTIALS"

    async def test_login_missing_fields(self, client: AsyncClient):
        """Test login with missing required fields."""
        login_data = {
            "email": "test@example.com"
            # Missing password
        }
        
        response = await client.post("/auth/login", json=login_data)
        
        assert response.status_code == 422


class TestAuthMe:
    """Test /me endpoint for getting current user info."""

    async def test_me_with_valid_token(self, client: AsyncClient, test_user: User):
        """Test /me endpoint with valid authentication token."""
        # First login to get token
        login_data = {
            "email": test_user.email,
            "password": "testpassword"
        }
        login_response = await client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Use token to access /auth/me
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        # Role comes from relationship, check if it exists
        assert "id" in data

    async def test_me_without_token(self, client: AsyncClient):
        """Test /auth/me endpoint without authentication token."""
        response = await client.get("/auth/me")

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    async def test_me_with_invalid_token(self, client: AsyncClient):
        """Test /auth/me endpoint with invalid token."""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = await client.get("/auth/me", headers=headers)

        assert response.status_code == 401
        data = response.json()
        # FastAPI wraps our error in a detail field
        assert "detail" in data
        if isinstance(data["detail"], dict):
            assert "error_code" in data["detail"]

    async def test_me_with_malformed_header(self, client: AsyncClient):
        """Test /auth/me endpoint with malformed Authorization header."""
        headers = {"Authorization": "InvalidFormat token_here"}
        response = await client.get("/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    async def test_register_invalid_role(self, client: AsyncClient):
        """Test registration with invalid role."""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "securepassword123",
            "role": "INVALID_ROLE"
        }
        
        response = await client.post("/auth/register", json=user_data)
        
        assert response.status_code == 422  # Pydantic validation error for enum
        data = response.json()
        assert "detail" in data

    async def test_me_user_not_found(self, client: AsyncClient, db_session: AsyncSession):
        """Test /auth/me endpoint when user is deleted after token creation."""
        # Create a token for a non-existent user ID
        fake_user_id = 99999
        token = create_access_token(subject=fake_user_id)
        
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/me", headers=headers)
        
        assert response.status_code == 404
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "USER_NOT_FOUND"

    async def test_register_empty_email(self, client: AsyncClient):
        """Test registration with empty email."""
        user_data = {
            "email": "",
            "username": "validusername",
            "password": "securepassword123",
            "role": "BUYER"
        }
        
        response = await client.post("/auth/register", json=user_data)
        assert response.status_code == 422

    async def test_register_empty_username(self, client: AsyncClient):
        """Test registration with empty username."""
        user_data = {
            "email": "valid@example.com",
            "username": "",
            "password": "securepassword123",
            "role": "BUYER"
        }
        
        response = await client.post("/auth/register", json=user_data)
        assert response.status_code == 422

    async def test_login_empty_email(self, client: AsyncClient):
        """Test login with empty email."""
        login_data = {
            "email": "",
            "password": "somepassword"
        }
        
        response = await client.post("/auth/login", json=login_data)
        assert response.status_code == 422

    async def test_login_empty_password(self, client: AsyncClient):
        """Test login with empty password."""
        login_data = {
            "email": "test@example.com",
            "password": ""
        }
        
        response = await client.post("/auth/login", json=login_data)
        assert response.status_code == 401  # Will find user but password validation will fail
