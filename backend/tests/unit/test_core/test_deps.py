"""Tests for dependencies module."""
import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user_id, get_current_user
from app.users.models import User
from app.core.security import create_access_token


class TestDependencies:
    """Test cases for application dependencies."""

    def test_get_db_dep_callable(self):
        """Test get_db_dep is callable."""
        from app.deps import get_db_dep
        
        # get_db_dep is a generator function, we just test it exists
        assert callable(get_db_dep)

    @pytest.mark.asyncio
    async def test_get_current_user_id_valid_token(self):
        """Test extracting user ID from valid token."""
        # Create a valid token
        test_user_id = 123
        token = create_access_token(subject=test_user_id)
        
        # Mock the token in the format the dependency expects
        result = await get_current_user_id(token)
        
        assert result == str(test_user_id)

    @pytest.mark.asyncio
    async def test_get_current_user_id_invalid_token(self):
        """Test that invalid token raises HTTPException."""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(invalid_token)
        
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_id_empty_token(self):
        """Test that empty token raises HTTPException."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id("")
        
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_success(self, db_session: AsyncSession, test_user: User):
        """Test successful user retrieval."""
        user_id = str(test_user.id)
        
        result = await get_current_user(user_id, db_session)
        
        assert result == test_user
        assert result.id == test_user.id
        assert result.email == test_user.email

    @pytest.mark.asyncio
    async def test_get_current_user_not_found(self, db_session: AsyncSession):
        """Test user not found raises HTTPException."""
        non_existent_user_id = "99999"
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(non_existent_user_id, db_session)
        
        assert exc_info.value.status_code == 404

    def test_require_non_buyer_role_supplier_success(self, test_supplier):
        """Test require_non_buyer_role allows suppliers."""
        from app.deps import require_non_buyer_role
        
        result = require_non_buyer_role(current_user=test_supplier)
        assert result == test_supplier

    def test_require_non_buyer_role_admin_success(self, test_admin):
        """Test require_non_buyer_role allows admins."""
        from app.deps import require_non_buyer_role
        
        result = require_non_buyer_role(current_user=test_admin)
        assert result == test_admin

    def test_require_non_buyer_role_buyer_fails(self, test_user):
        """Test require_non_buyer_role rejects buyers."""
        from app.deps import require_non_buyer_role
        
        with pytest.raises(HTTPException) as exc_info:
            require_non_buyer_role(current_user=test_user)
        
        assert exc_info.value.status_code == 403

    def test_require_supplier_role_success(self, test_supplier):
        """Test require_supplier_role allows suppliers."""
        from app.deps import require_supplier_role
        
        result = require_supplier_role(current_user=test_supplier)
        assert result == test_supplier

    def test_require_supplier_role_admin_fails(self, test_admin):
        """Test require_supplier_role rejects admins."""
        from app.deps import require_supplier_role
        
        with pytest.raises(HTTPException) as exc_info:
            require_supplier_role(current_user=test_admin)
        
        assert exc_info.value.status_code == 403

    def test_require_supplier_role_buyer_fails(self, test_user):
        """Test require_supplier_role rejects buyers."""
        from app.deps import require_supplier_role
        
        with pytest.raises(HTTPException) as exc_info:
            require_supplier_role(current_user=test_user)
        
        assert exc_info.value.status_code == 403

    def test_require_admin_role_success(self, test_admin):
        """Test require_admin_role allows admins."""
        from app.deps import require_admin_role
        
        result = require_admin_role(current_user=test_admin)
        assert result == test_admin

    def test_require_admin_role_supplier_fails(self, test_supplier):
        """Test require_admin_role rejects suppliers."""
        from app.deps import require_admin_role
        
        with pytest.raises(HTTPException) as exc_info:
            require_admin_role(current_user=test_supplier)
        
        assert exc_info.value.status_code == 403

    def test_require_admin_role_buyer_fails(self, test_user):
        """Test require_admin_role rejects buyers."""
        from app.deps import require_admin_role
        
        with pytest.raises(HTTPException) as exc_info:
            require_admin_role(current_user=test_user)
        
        assert exc_info.value.status_code == 403

    def test_require_supplier_or_admin_role_supplier_success(self, test_supplier):
        """Test require_supplier_or_admin_role allows suppliers."""
        from app.deps import require_supplier_or_admin_role
        
        result = require_supplier_or_admin_role(current_user=test_supplier)
        assert result == test_supplier

    def test_require_supplier_or_admin_role_admin_success(self, test_admin):
        """Test require_supplier_or_admin_role allows admins."""
        from app.deps import require_supplier_or_admin_role
        
        result = require_supplier_or_admin_role(current_user=test_admin)
        assert result == test_admin

    def test_require_supplier_or_admin_role_buyer_fails(self, test_user):
        """Test require_supplier_or_admin_role rejects buyers."""
        from app.deps import require_supplier_or_admin_role
        
        with pytest.raises(HTTPException) as exc_info:
            require_supplier_or_admin_role(current_user=test_user)
        
        assert exc_info.value.status_code == 403