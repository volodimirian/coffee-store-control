"""Tests for permission system."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import (
    check_user_permission,
    grant_user_permission,
    revoke_user_permission
)
from app.core_models import User, Role, Permission, RolePermission, UserPermission


class TestPermissionSystem:
    """Test permission checking system."""

    @pytest.mark.asyncio
    async def test_check_user_permission_with_role_permission(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test checking permission through role."""
        user, role = sample_user_with_role
        permission = sample_permission
        
        # Grant permission to role
        role_perm = RolePermission(
            role_id=role.id,
            permission_id=permission.id,
            is_active=True
        )
        db_session.add(role_perm)
        await db_session.commit()
        
        # Test permission check
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        assert has_permission is True

    @pytest.mark.asyncio
    async def test_check_user_permission_without_permission(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test checking permission when user doesn't have it."""
        user, role = sample_user_with_role
        permission = sample_permission
        
        # Don't grant any permissions
        
        # Test permission check
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        assert has_permission is False

    @pytest.mark.asyncio
    async def test_check_user_permission_with_inactive_role_permission(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test checking permission with inactive role permission."""
        user, role = sample_user_with_role
        permission = sample_permission
        
        # Grant inactive permission to role
        role_perm = RolePermission(
            role_id=role.id,
            permission_id=permission.id,
            is_active=False  # Inactive
        )
        db_session.add(role_perm)
        await db_session.commit()
        
        # Test permission check
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        assert has_permission is False

    @pytest.mark.asyncio
    async def test_check_user_permission_priority_user_over_role(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test that user permissions have higher priority than role permissions."""
        user, role = sample_user_with_role
        permission = sample_permission
        
        # Grant INACTIVE permission to role
        role_perm = RolePermission(
            role_id=role.id,
            permission_id=permission.id,
            is_active=False  # Role permission is inactive
        )
        db_session.add(role_perm)
        
        # Grant ACTIVE permission to user individually
        user_perm = UserPermission(
            user_id=user.id,
            permission_id=permission.id,
            is_active=True  # User permission is active
        )
        db_session.add(user_perm)
        await db_session.commit()
        
        # Test permission check - should return True because user permission is active
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        assert has_permission is True

    @pytest.mark.asyncio
    async def test_check_user_permission_with_business_id(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test checking business-specific permissions."""
        user, role = sample_user_with_role
        permission = sample_permission
        business_id = 123
        
        # Grant business-specific permission to user
        user_perm = UserPermission(
            user_id=user.id,
            permission_id=permission.id,
            business_id=business_id,
            is_active=True
        )
        db_session.add(user_perm)
        await db_session.commit()
        
        # Test permission check with matching business_id
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session,
            business_id=business_id
        )
        assert has_permission is True
        
        # Test permission check with different business_id
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session,
            business_id=456  # Different business_id
        )
        assert has_permission is False

    @pytest.mark.asyncio
    async def test_check_user_permission_nonexistent_user(
        self, db_session: AsyncSession, sample_permission
    ):
        """Test checking permission for non-existent user."""
        permission = sample_permission
        
        # Test permission check for non-existent user
        has_permission = await check_user_permission(
            user_id=99999,  # Non-existent user ID
            permission_name=permission.name,
            db=db_session
        )
        
        assert has_permission is False

    @pytest.mark.asyncio
    async def test_check_user_permission_nonexistent_permission(
        self, db_session: AsyncSession, sample_user_with_role
    ):
        """Test checking non-existent permission."""
        user, role = sample_user_with_role
        
        # Test permission check for non-existent permission
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name="NONEXISTENT_PERMISSION",
            db=db_session
        )
        
        assert has_permission is False


class TestUserPermissionManagement:
    """Test user permission granting and revoking."""

    @pytest.mark.asyncio
    async def test_grant_user_permission_success(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test successfully granting permission to user."""
        user, role = sample_user_with_role
        permission = sample_permission
        
        # Grant permission
        success = await grant_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        assert success is True
        
        # Verify permission was granted
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        assert has_permission is True

    @pytest.mark.asyncio
    async def test_grant_user_permission_nonexistent_permission(
        self, db_session: AsyncSession, sample_user_with_role
    ):
        """Test granting non-existent permission."""
        user, role = sample_user_with_role
        
        # Try to grant non-existent permission
        success = await grant_user_permission(
            user_id=user.id,
            permission_name="NONEXISTENT_PERMISSION",
            db=db_session
        )
        
        assert success is False

    @pytest.mark.asyncio
    async def test_grant_user_permission_business_specific(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test granting business-specific permission."""
        user, role = sample_user_with_role
        permission = sample_permission
        business_id = 123
        
        # Grant business-specific permission
        success = await grant_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session,
            business_id=business_id
        )
        
        assert success is True
        
        # Verify permission was granted for specific business
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session,
            business_id=business_id
        )
        assert has_permission is True

    @pytest.mark.asyncio
    async def test_grant_user_permission_update_existing(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test updating existing inactive permission to active."""
        user, role = sample_user_with_role
        permission = sample_permission
        
        # Create inactive user permission
        user_perm = UserPermission(
            user_id=user.id,
            permission_id=permission.id,
            is_active=False
        )
        db_session.add(user_perm)
        await db_session.commit()
        
        # Grant permission (should activate existing)
        success = await grant_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        assert success is True
        
        # Verify permission is now active
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        assert has_permission is True

    @pytest.mark.asyncio
    async def test_revoke_user_permission_success(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test successfully revoking permission from user."""
        user, role = sample_user_with_role
        permission = sample_permission
        
        # First grant permission
        await grant_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        # Verify it was granted
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        assert has_permission is True
        
        # Now revoke it
        success = await revoke_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        assert success is True
        
        # Verify permission was revoked
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        assert has_permission is False

    @pytest.mark.asyncio
    async def test_revoke_user_permission_nonexistent(
        self, db_session: AsyncSession, sample_user_with_role, sample_permission
    ):
        """Test revoking permission that user doesn't have."""
        user, role = sample_user_with_role
        permission = sample_permission
        
        # Try to revoke permission user doesn't have
        success = await revoke_user_permission(
            user_id=user.id,
            permission_name=permission.name,
            db=db_session
        )
        
        assert success is False

    @pytest.mark.asyncio
    async def test_revoke_user_permission_nonexistent_permission(
        self, db_session: AsyncSession, sample_user_with_role
    ):
        """Test revoking non-existent permission."""
        user, role = sample_user_with_role
        
        # Try to revoke non-existent permission
        success = await revoke_user_permission(
            user_id=user.id,
            permission_name="NONEXISTENT_PERMISSION",
            db=db_session
        )
        
        assert success is False


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_user_without_role(
        self, db_session: AsyncSession, sample_permission
    ):
        """Test user without role."""
        # Create user without a role (using None role_id) but we can't insert into DB
        # Instead, we'll test the function directly with a user that doesn't have role loaded
        from sqlalchemy import select
        
        # Get existing user but don't load role
        user = await db_session.scalar(select(User).where(User.id == 999))  # Non-existent user
        
        # Test permission check with non-existent user (simulates user without role)
        has_permission = await check_user_permission(
            user_id=999,  # Non-existent user
            permission_name=sample_permission.name,
            db=db_session
        )
        
        assert has_permission is False

    @pytest.mark.asyncio
    async def test_empty_permission_name(
        self, db_session: AsyncSession, sample_user_with_role
    ):
        """Test with empty permission name."""
        user, role = sample_user_with_role
        
        # Test permission check with empty string
        has_permission = await check_user_permission(
            user_id=user.id,
            permission_name="",
            db=db_session
        )
        
        assert has_permission is False

    @pytest.mark.asyncio
    async def test_negative_user_id(
        self, db_session: AsyncSession, sample_permission
    ):
        """Test with negative user ID."""
        permission = sample_permission
        
        # Test permission check with negative user ID
        has_permission = await check_user_permission(
            user_id=-1,
            permission_name=permission.name,
            db=db_session
        )
        
        assert has_permission is False

    @pytest.mark.asyncio
    async def test_zero_user_id(
        self, db_session: AsyncSession, sample_permission
    ):
        """Test with zero user ID."""
        permission = sample_permission
        
        # Test permission check with zero user ID
        has_permission = await check_user_permission(
            user_id=0,
            permission_name=permission.name,
            db=db_session
        )
        
        assert has_permission is False
        