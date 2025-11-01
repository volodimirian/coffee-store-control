"""Business service layer for managing coffee shops and business operations."""

from datetime import datetime
from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import Business, User, UserBusiness, Role, Permission, UserPermission
from app.core.security import hash_password
from app.core.error_codes import ErrorCode
from app.businesses.schemas import (
    BusinessCreate,
    BusinessUpdate,
    UserBusinessCreate,
    UserBusinessUpdate,
    BusinessMemberOut,
    EmployeeCreateRequest,
    EmployeeOut,
)


class BusinessService:
    """Service class for business operations."""

    @staticmethod
    async def create_business(
        session: AsyncSession,
        business_data: BusinessCreate,
        owner_id: int,
    ) -> Business:
        """Create a new business with the specified owner."""
        db_business = Business(
            name=business_data.name,
            city=business_data.city,
            address=business_data.address,
            owner_id=owner_id,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(db_business)
        await session.flush()
        await session.refresh(db_business)
        
        # Automatically add owner as manager in user_businesses
        user_business = UserBusiness(
            user_id=owner_id,
            business_id=db_business.id,
            role_in_business="owner",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(user_business)
        await session.commit()
        
        return db_business

    @staticmethod
    async def get_business_by_id(session: AsyncSession, business_id: int) -> Optional[Business]:
        """Get business by ID."""
        result = await session.execute(
            select(Business).where(Business.id == business_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_businesses_by_owner(
        session: AsyncSession, 
        owner_id: int,
        is_active: Optional[bool] = None
    ) -> list[Business]:
        """Get all businesses owned by a specific user."""
        query = select(Business).where(Business.owner_id == owner_id)
        
        if is_active is not None:
            query = query.where(Business.is_active == is_active)
            
        result = await session.execute(query.order_by(Business.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_user_businesses(
        session: AsyncSession, 
        user_id: int,
        is_active: Optional[bool] = None
    ) -> list[Business]:
        """Get all businesses where user is a member (including owned)."""
        query = (
            select(Business)
            .join(UserBusiness)
            .where(UserBusiness.user_id == user_id)
        )
        
        if is_active is not None:
            query = query.where(
                and_(Business.is_active == is_active, UserBusiness.is_active == is_active)
            )
            
        result = await session.execute(query.order_by(Business.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def update_business(
        session: AsyncSession,
        business_id: int,
        business_data: BusinessUpdate,
    ) -> Optional[Business]:
        """Update business information."""
        business = await BusinessService.get_business_by_id(session, business_id)
        if not business:
            return None

        update_data = business_data.model_dump(exclude_unset=True)
        if update_data:
            for field, value in update_data.items():
                setattr(business, field, value)
            business.updated_at = datetime.utcnow()
            await session.commit()
            await session.refresh(business)

        return business

    @staticmethod
    async def delete_business(session: AsyncSession, business_id: int) -> bool:
        """Soft delete business by setting is_active to False."""
        business = await BusinessService.get_business_by_id(session, business_id)
        if not business:
            return False

        business.is_active = False
        business.updated_at = datetime.utcnow()
        await session.commit()
        return True

    @staticmethod
    async def restore_business(session: AsyncSession, business_id: int) -> bool:
        """Restore soft-deleted business by setting is_active to True."""
        business = await BusinessService.get_business_by_id(session, business_id)
        if not business:
            return False

        business.is_active = True
        business.updated_at = datetime.utcnow()
        await session.commit()
        return True

    @staticmethod
    async def add_user_to_business(
        session: AsyncSession,
        user_business_data: UserBusinessCreate,
    ) -> Optional[UserBusiness]:
        """Add a user to business with specified role."""
        # Check if relationship already exists
        existing = await session.execute(
            select(UserBusiness).where(
                and_(
                    UserBusiness.user_id == user_business_data.user_id,
                    UserBusiness.business_id == user_business_data.business_id,
                )
            )
        )
        if existing.scalars().first():
            return None  # Relationship already exists

        user_business = UserBusiness(
            user_id=user_business_data.user_id,
            business_id=user_business_data.business_id,
            role_in_business=user_business_data.role_in_business,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(user_business)
        await session.commit()
        await session.refresh(user_business)
        return user_business

    @staticmethod
    async def update_user_business_role(
        session: AsyncSession,
        user_id: int,
        business_id: int,
        update_data: UserBusinessUpdate,
    ) -> Optional[UserBusiness]:
        """Update user's role or status in business."""
        result = await session.execute(
            select(UserBusiness).where(
                and_(
                    UserBusiness.user_id == user_id,
                    UserBusiness.business_id == business_id,
                )
            )
        )
        user_business = result.scalars().first()
        if not user_business:
            return None

        update_fields = update_data.model_dump(exclude_unset=True)
        if update_fields:
            for field, value in update_fields.items():
                setattr(user_business, field, value)
            user_business.updated_at = datetime.utcnow()
            await session.commit()
            await session.refresh(user_business)

        return user_business

    @staticmethod
    async def remove_user_from_business(
        session: AsyncSession,
        user_id: int,
        business_id: int,
    ) -> bool:
        """Remove user from business (soft delete)."""
        result = await session.execute(
            select(UserBusiness).where(
                and_(
                    UserBusiness.user_id == user_id,
                    UserBusiness.business_id == business_id,
                )
            )
        )
        user_business = result.scalars().first()
        if not user_business:
            return False

        user_business.is_active = False
        user_business.updated_at = datetime.utcnow()
        await session.commit()
        return True

    @staticmethod
    async def get_business_members(
        session: AsyncSession,
        business_id: int,
        is_active: Optional[bool] = True,
    ) -> list[BusinessMemberOut]:
        """Get all members of a business with their user information."""
        query = (
            select(UserBusiness, User)
            .join(User, UserBusiness.user_id == User.id)
            .where(UserBusiness.business_id == business_id)
        )
        
        if is_active is not None:
            query = query.where(UserBusiness.is_active == is_active)
            
        result = await session.execute(query.order_by(UserBusiness.created_at))
        rows = result.all()
        
        return [
            BusinessMemberOut(
                user_id=user_business.user_id,
                username=user.username,
                email=user.email,
                role_in_business=user_business.role_in_business,
                is_active=user_business.is_active,
                joined_at=user_business.created_at,
            )
            for user_business, user in rows
        ]

    @staticmethod
    async def can_user_manage_business(
        session: AsyncSession,
        user_id: int,
        business_id: int,
    ) -> bool:
        """Check if user can manage business (owner or manager)."""
        # Check if user is owner
        business = await BusinessService.get_business_by_id(session, business_id)
        if business and business.owner_id == user_id:
            return True

        # Check if user has manager role
        result = await session.execute(
            select(UserBusiness).where(
                and_(
                    UserBusiness.user_id == user_id,
                    UserBusiness.business_id == business_id,
                    UserBusiness.role_in_business.in_(["manager", "admin"]),
                    UserBusiness.is_active,
                )
            )
        )
        return result.scalars().first() is not None

    @staticmethod
    async def can_user_access_business(
        session: AsyncSession,
        user_id: int,
        business_id: int,
    ) -> bool:
        """Check if user has any access to business."""
        # Check if user is owner
        business = await BusinessService.get_business_by_id(session, business_id)
        if business and business.owner_id == user_id:
            return True

        # Check if user is a member
        result = await session.execute(
            select(UserBusiness).where(
                and_(
                    UserBusiness.user_id == user_id,
                    UserBusiness.business_id == business_id,
                    UserBusiness.is_active,
                )
            )
        )
        return result.scalars().first() is not None

    @staticmethod
    async def is_user_owner_or_admin(
        session: AsyncSession,
        user_id: int,
        business_id: int,
    ) -> bool:
        """Check if user is owner or has admin role in the business."""
        # Check if user is owner
        business = await BusinessService.get_business_by_id(session, business_id)
        if business and business.owner_id == user_id:
            return True

        # Check if user has admin role
        result = await session.execute(
            select(UserBusiness).where(
                and_(
                    UserBusiness.user_id == user_id,
                    UserBusiness.business_id == business_id,
                    UserBusiness.role_in_business == "admin",
                    UserBusiness.is_active,
                )
            )
        )
        return result.scalars().first() is not None

    @staticmethod
    async def create_employee(
        session: AsyncSession,
        employee_data: EmployeeCreateRequest,
        owner_id: int,
    ) -> tuple[Optional[User], Optional[ErrorCode]]:
        """Create a new employee user and add to business.
        
        Returns:
            Tuple of (created_user, error_code). If successful, error_code is None.
        """
        # Check if email already exists
        existing_email = await session.scalar(select(User).where(User.email == employee_data.email))
        if existing_email:
            return None, ErrorCode.EMAIL_ALREADY_EXISTS
        
        # Check if username already exists
        existing_username = await session.scalar(select(User).where(User.username == employee_data.username))
        if existing_username:
            return None, ErrorCode.USERNAME_ALREADY_EXISTS
        
        # Verify business exists and user is owner
        business = await BusinessService.get_business_by_id(session, employee_data.business_id)
        if not business:
            return None, ErrorCode.BUSINESS_NOT_FOUND
        
        if business.owner_id != owner_id:
            return None, ErrorCode.ONLY_OWNER_CAN_CREATE_EMPLOYEES
        
        # Get EMPLOYEE role
        employee_role = await session.scalar(select(Role).where(Role.name == "EMPLOYEE"))
        if not employee_role:
            return None, ErrorCode.EMPLOYEE_ROLE_NOT_FOUND
        
        # Create user
        new_user = User(
            email=employee_data.email,
            username=employee_data.username,
            password_hash=hash_password(employee_data.password),
            role_id=employee_role.id,
            created_at=datetime.utcnow(),
        )
        session.add(new_user)
        await session.flush()  # Get user ID
        await session.refresh(new_user)
        
        # Add user to business
        user_business = UserBusiness(
            user_id=new_user.id,
            business_id=employee_data.business_id,
            role_in_business=employee_data.role_in_business,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(user_business)
        await session.commit()
        
        return new_user, None

    @staticmethod
    async def get_employee_with_permissions(
        session: AsyncSession,
        user_id: int,
        business_id: int,
    ) -> Optional[EmployeeOut]:
        """Get employee details with their permissions."""
        result = await session.execute(
            select(UserBusiness, User)
            .join(User, UserBusiness.user_id == User.id)
            .where(
                and_(
                    UserBusiness.user_id == user_id,
                    UserBusiness.business_id == business_id,
                )
            )
        )
        row = result.first()
        if not row:
            return None
        
        user_business, user = row
        
        # Get user's permissions for this business
        permissions_result = await session.execute(
            select(Permission.name)
            .select_from(UserPermission)
            .join(Permission, UserPermission.permission_id == Permission.id)
            .where(
                and_(
                    UserPermission.user_id == user_id,
                    UserPermission.is_active,
                    (UserPermission.business_id == business_id) | (UserPermission.business_id.is_(None))
                )
            )
        )
        permissions = [perm for perm, in permissions_result.all()]
        
        return EmployeeOut(
            user_id=user.id,
            username=user.username,
            email=user.email,
            role_in_business=user_business.role_in_business,
            is_active=user_business.is_active,
            joined_at=user_business.created_at,
            permissions=permissions,
        )

    @staticmethod
    async def get_owner_employees(
        session: AsyncSession,
        owner_id: int,
    ) -> list[EmployeeOut]:
        """Get all employees across all businesses owned by user."""
        # Get all businesses owned by user
        businesses = await BusinessService.get_businesses_by_owner(session, owner_id, is_active=True)
        business_ids = [b.id for b in businesses]
        
        if not business_ids:
            return []
        
        # Get all employees from these businesses
        result = await session.execute(
            select(UserBusiness, User)
            .join(User, UserBusiness.user_id == User.id)
            .where(
                and_(
                    UserBusiness.business_id.in_(business_ids),
                    UserBusiness.role_in_business.in_(["employee", "manager"]),  # Not owners
                    UserBusiness.is_active,
                )
            )
            .order_by(User.username)
        )
        rows = result.all()
        
        # Get permissions for all these users
        employee_list = []
        for user_business, user in rows:
            permissions_result = await session.execute(
                select(Permission.name)
                .select_from(UserPermission)
                .join(Permission, UserPermission.permission_id == Permission.id)
                .where(
                    and_(
                        UserPermission.user_id == user.id,
                        UserPermission.is_active,
                        (UserPermission.business_id == user_business.business_id) | (UserPermission.business_id.is_(None))
                    )
                )
            )
            permissions = [perm for perm, in permissions_result.all()]
            
            employee_list.append(EmployeeOut(
                user_id=user.id,
                username=user.username,
                email=user.email,
                role_in_business=user_business.role_in_business,
                is_active=user_business.is_active,
                joined_at=user_business.created_at,
                permissions=permissions,
            ))
        
        return employee_list
    