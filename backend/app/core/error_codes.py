"""
Error codes for internationalization support.
Frontend can use these codes to display localized error messages.
"""

from enum import Enum


class ErrorCode(str, Enum):
    """Error codes for API responses."""
    
    # Authentication & Authorization
    UNAUTHORIZED = "UNAUTHORIZED"  # "Invalid or expired token"
    FORBIDDEN = "FORBIDDEN"  # "Access denied"
    USER_NOT_FOUND = "USER_NOT_FOUND"  # "User not found"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"  # "Invalid email or password"
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"  # "Email already registered"
    USERNAME_ALREADY_EXISTS = "USERNAME_ALREADY_EXISTS"  # "Username already taken"
    INVALID_ROLE = "INVALID_ROLE"  # "Invalid role specified"
    
    # Role-based access
    BUYERS_NOT_ALLOWED = "BUYERS_NOT_ALLOWED"  # "This operation is not allowed for buyers"
    SUPPLIERS_ONLY = "SUPPLIERS_ONLY"  # "Only suppliers can perform this operation"
    ADMIN_ONLY = "ADMIN_ONLY"  # "Administrative privileges required"
    
    # Categories
    CATEGORY_NOT_FOUND = "CATEGORY_NOT_FOUND"  # "Category not found"
    CATEGORY_NAME_EXISTS = "CATEGORY_NAME_EXISTS"  # "Category with this name already exists"
    CATEGORY_HAS_SUBCATEGORIES = "CATEGORY_HAS_SUBCATEGORIES"  # "Cannot delete category with subcategories"
    
    # Subcategories
    SUBCATEGORY_NOT_FOUND = "SUBCATEGORY_NOT_FOUND"  # "Subcategory not found"
    SUBCATEGORY_NAME_EXISTS = "SUBCATEGORY_NAME_EXISTS"  # "Subcategory with this name already exists in this category"
    
    # Products
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"  # "Product not found"
    PRODUCT_NOT_OWNED = "PRODUCT_NOT_OWNED"  # "You can only modify your own products"
    INVALID_PRICE = "INVALID_PRICE"  # "Invalid price format"
    INVALID_CATEGORY = "INVALID_CATEGORY"  # "Invalid category or subcategory"
    
    # Business & Employees
    BUSINESS_NOT_FOUND = "BUSINESS_NOT_FOUND"  # "Business not found"
    BUSINESS_ACCESS_DENIED = "BUSINESS_ACCESS_DENIED"  # "Access denied to this business"
    BUSINESS_ID_MISMATCH = "BUSINESS_ID_MISMATCH"  # "Business ID in URL and request body must match"
    USER_ALREADY_BUSINESS_MEMBER = "USER_ALREADY_BUSINESS_MEMBER"  # "User is already a member of this business"
    CANNOT_REMOVE_BUSINESS_OWNER = "CANNOT_REMOVE_BUSINESS_OWNER"  # "Cannot remove business owner from business"
    ONLY_OWNER_CAN_DELETE = "ONLY_OWNER_CAN_DELETE"  # "Only business owner can delete business"
    ONLY_OWNER_CAN_RESTORE = "ONLY_OWNER_CAN_RESTORE"  # "Only business owner can restore business"
    BUSINESS_OPERATION_FAILED = "BUSINESS_OPERATION_FAILED"  # "Business operation failed"
    EMPLOYEE_CREATION_FAILED = "EMPLOYEE_CREATION_FAILED"  # "Failed to retrieve created employee"
    EMPLOYEE_ROLE_NOT_FOUND = "EMPLOYEE_ROLE_NOT_FOUND"  # "Employee role not found in system"
    PERMISSION_NOT_FOUND = "PERMISSION_NOT_FOUND"  # "Permission not found"
    USER_NOT_BUSINESS_MEMBER = "USER_NOT_BUSINESS_MEMBER"  # "User is not a member of this business"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"  # "Insufficient permissions to perform this action"
    ONLY_OWNER_CAN_CREATE_EMPLOYEES = "ONLY_OWNER_CAN_CREATE_EMPLOYEES"  # "Only business owner can create employees"
    ONLY_OWNER_CAN_MANAGE_PERMISSIONS = "ONLY_OWNER_CAN_MANAGE_PERMISSIONS"  # "Only business owner can manage permissions"
    ONLY_OWNERS_CAN_SEARCH_USERS = "ONLY_OWNERS_CAN_SEARCH_USERS"  # "Only business owners can search for users"
    CANNOT_ASSIGN_BUSINESS_OWNER_ROLE = "CANNOT_ASSIGN_BUSINESS_OWNER_ROLE"  # "Cannot assign business owner role to employees"
    
    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"  # "Validation failed"
    REQUIRED_FIELD = "REQUIRED_FIELD"  # "This field is required"
    INVALID_FORMAT = "INVALID_FORMAT"  # "Invalid format"
    
    # General
    INTERNAL_ERROR = "INTERNAL_ERROR"  # "Internal server error"
    NOT_FOUND = "NOT_FOUND"  # "Resource not found"
    CONFLICT = "CONFLICT"  # "Resource conflict"
    BAD_REQUEST = "BAD_REQUEST"  # "Bad request"


class ErrorMessages:
    """Default English error messages for reference."""
    
    # Authentication & Authorization
    UNAUTHORIZED = "Invalid or expired token"
    FORBIDDEN = "Access denied"
    USER_NOT_FOUND = "User not found"
    INVALID_CREDENTIALS = "Invalid email or password"
    EMAIL_ALREADY_EXISTS = "Email already registered"
    USERNAME_ALREADY_EXISTS = "Username already taken"
    INVALID_ROLE = "Invalid role specified"
    
    # Role-based access
    BUYERS_NOT_ALLOWED = "This operation is not allowed for buyers"
    SUPPLIERS_ONLY = "Only suppliers can perform this operation"
    ADMIN_ONLY = "Administrative privileges required"
    
    # Categories
    CATEGORY_NOT_FOUND = "Category not found"
    CATEGORY_NAME_EXISTS = "Category with this name already exists"
    CATEGORY_HAS_SUBCATEGORIES = "Cannot delete category with subcategories. Delete subcategories first."
    
    # Subcategories
    SUBCATEGORY_NOT_FOUND = "Subcategory not found"
    SUBCATEGORY_NAME_EXISTS = "Subcategory with this name already exists in this category"
    
    # Products
    PRODUCT_NOT_FOUND = "Product not found"
    PRODUCT_NOT_OWNED = "You can only modify your own products"
    INVALID_PRICE = "Invalid price format"
    INVALID_CATEGORY = "Invalid category or subcategory"
    
    # Business & Employees
    BUSINESS_NOT_FOUND = "Business not found"
    BUSINESS_ACCESS_DENIED = "Access denied to this business"
    BUSINESS_ID_MISMATCH = "Business ID in URL and request body must match"
    USER_ALREADY_BUSINESS_MEMBER = "User is already a member of this business"
    CANNOT_REMOVE_BUSINESS_OWNER = "Cannot remove business owner from business"
    ONLY_OWNER_CAN_DELETE = "Only business owner can delete business"
    ONLY_OWNER_CAN_RESTORE = "Only business owner can restore business"
    BUSINESS_OPERATION_FAILED = "Business operation failed"
    EMPLOYEE_CREATION_FAILED = "Failed to retrieve created employee"
    EMPLOYEE_ROLE_NOT_FOUND = "Employee role not found in system"
    PERMISSION_NOT_FOUND = "Permission not found"
    USER_NOT_BUSINESS_MEMBER = "User is not a member of this business"
    INSUFFICIENT_PERMISSIONS = "Insufficient permissions to perform this action"
    ONLY_OWNER_CAN_CREATE_EMPLOYEES = "Only business owner can create employees"
    ONLY_OWNER_CAN_MANAGE_PERMISSIONS = "Only business owner can manage permissions"
    ONLY_OWNERS_CAN_SEARCH_USERS = "Only business owners can search for users"
    CANNOT_ASSIGN_BUSINESS_OWNER_ROLE = "Cannot assign business owner role to employees"
    
    # Validation
    VALIDATION_ERROR = "Validation failed"
    REQUIRED_FIELD = "This field is required"
    INVALID_FORMAT = "Invalid format"
    
    # General
    INTERNAL_ERROR = "Internal server error"
    NOT_FOUND = "Resource not found"
    CONFLICT = "Resource conflict"
    BAD_REQUEST = "Bad request"


def create_error_response(error_code: ErrorCode, detail: str | None = None) -> dict:
    """
    Create standardized error response.
    
    Args:
        error_code: Error code for frontend i18n
        detail: Optional detailed message (falls back to default)
    
    Returns:
        Dict with error_code and detail
    """
    if detail is None:
        detail = getattr(ErrorMessages, error_code.value, error_code.value)
    
    return {
        "error_code": error_code.value,
        "detail": detail
    }