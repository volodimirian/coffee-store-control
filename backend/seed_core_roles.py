"""Seed script for core role system."""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import engine
from app.core_models import Role, Permission, RolePermission, UserRole



async def seed_expense_permissions():
    """Create permissions for expense tracking module."""
    permissions_data = [
        # Expense tracking permissions from TASKS.md lines 63-69
        {"name": "VIEW_DATA", "description": "View expense data", "resource": "expenses", "action": "view"},
        {"name": "ADD_DATA", "description": "Add expense records", "resource": "expenses", "action": "create"},
        {"name": "EDIT_DATA", "description": "Edit expense records", "resource": "expenses", "action": "edit"},
        {"name": "MANAGE_SECTIONS", "description": "Manage expense sections", "resource": "sections", "action": "manage"},
        {"name": "VIEW_TOTALS", "description": "View expense totals", "resource": "expenses", "action": "view_totals"},
        {"name": "EXPORT_DATA", "description": "Export expense data", "resource": "expenses", "action": "export"},
        {"name": "MANAGE_MONTHS", "description": "Manage month periods", "resource": "periods", "action": "manage"},
        
        # Basic user management permissions
        {"name": "VIEW_USERS", "description": "View users", "resource": "users", "action": "view"},
        {"name": "MANAGE_USERS", "description": "Manage users", "resource": "users", "action": "manage"},
        
        # API documentation permission for protected docs
        {"name": "VIEW_API_DOCS", "description": "Access API documentation", "resource": "api", "action": "view_docs"},
    ]
    
    async with AsyncSession(engine) as session:
        for perm_data in permissions_data:
            permission = Permission(**perm_data)
            session.add(permission)
        
        await session.commit()
        print("✅ Expense permissions created successfully")


async def seed_role_permissions():
    """Assign permissions to 3 core roles."""
    async with AsyncSession(engine) as session:
        # Get all roles and permissions
        from sqlalchemy import select
        
        roles_result = await session.execute(select(Role))
        roles = {role.name: role for role in roles_result.scalars().all()}
        
        permissions_result = await session.execute(select(Permission))
        permissions = {perm.name: perm for perm in permissions_result.scalars().all()}
        
        # Admin gets all permissions
        admin_role = roles[UserRole.ADMIN.value]
        for permission in permissions.values():
            role_perm = RolePermission(role_id=admin_role.id, permission_id=permission.id)
            session.add(role_perm)
        
        # Business owner permissions (most expense management)
        business_owner_role = roles[UserRole.BUSINESS_OWNER.value]
        business_owner_perms = [
            "VIEW_DATA", "ADD_DATA", "EDIT_DATA", "MANAGE_SECTIONS",
            "VIEW_TOTALS", "EXPORT_DATA", "MANAGE_MONTHS", "VIEW_USERS", "MANAGE_USERS"
        ]
        for perm_name in business_owner_perms:
            if perm_name in permissions:
                role_perm = RolePermission(
                    role_id=business_owner_role.id, 
                    permission_id=permissions[perm_name].id
                )
                session.add(role_perm)
        
        # Employee permissions (basic data entry only)
        employee_role = roles[UserRole.EMPLOYEE.value]
        employee_perms = ["VIEW_DATA", "ADD_DATA"]
        for perm_name in employee_perms:
            if perm_name in permissions:
                role_perm = RolePermission(
                    role_id=employee_role.id, 
                    permission_id=permissions[perm_name].id
                )
                session.add(role_perm)
        
        await session.commit()
        print("✅ Role permissions assigned successfully")


async def main():
    """Run all seed functions."""
    print("🌱 Starting core role system seeding...")
    
    try:
        await seed_expense_permissions()
        await seed_role_permissions()
        print("🎉 Core role system seeding completed successfully!")
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())