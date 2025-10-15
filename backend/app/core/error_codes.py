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