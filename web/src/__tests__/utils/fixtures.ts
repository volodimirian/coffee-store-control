// Test data fixtures for MSW and component tests

export const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  created_at: '2023-01-01T00:00:00Z',
  role: {
    id: 1,
    name: 'BUYER' as const,
    description: 'Buyer role'
  }
}

export const mockSupplier = {
  id: 2,
  email: 'supplier@example.com',
  username: 'testsupplier',
  created_at: '2023-01-01T00:00:00Z',
  role: {
    id: 2,
    name: 'SUPPLIER' as const,
    description: 'Supplier role'
  }
}

export const mockAdmin = {
  id: 3,
  email: 'admin@example.com',
  username: 'testadmin',
  created_at: '2023-01-01T00:00:00Z',
  role: {
    id: 3,
    name: 'ADMIN' as const,
    description: 'Admin role'
  }
}

export const mockAccessToken = 'mock_access_token'

export const mockAuthResponse = {
  access_token: mockAccessToken,
  token_type: 'bearer'
}

export const mockCategories = [
  {
    id: 1,
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    created_at: '2023-01-01T00:00:00Z',
    subcategories: [
      { 
        id: 1, 
        name: 'Smartphones', 
        description: 'Mobile phones',
        category_id: 1,
        created_at: '2023-01-01T00:00:00Z'
      },
      { 
        id: 2, 
        name: 'Laptops', 
        description: 'Portable computers',
        category_id: 1,
        created_at: '2023-01-01T00:00:00Z'
      }
    ]
  },
  {
    id: 2,
    name: 'Clothing',
    description: 'Fashion and apparel',
    created_at: '2023-01-01T00:00:00Z',
    subcategories: [
      { 
        id: 3, 
        name: "Men's Clothing", 
        description: 'Clothing for men',
        category_id: 2,
        created_at: '2023-01-01T00:00:00Z'
      },
      { 
        id: 4, 
        name: "Women's Clothing", 
        description: 'Clothing for women',
        category_id: 2,
        created_at: '2023-01-01T00:00:00Z'
      }
    ]
  }
]

export const mockProducts = [
  {
    id: 1,
    name: 'iPhone 15 Pro',
    description: 'Latest iPhone with advanced features',
    price: 999.99,
    category_id: 1,
    subcategory_id: 1,
    supplier_id: 2,
    custom_fields: {
      storage: '256GB',
      color: 'Space Black',
      warranty: '1 year'
    }
  },
  {
    id: 2,
    name: 'MacBook Air M3',
    description: 'Lightweight laptop with M3 chip',
    price: 1299.99,
    category_id: 1,
    subcategory_id: 2,
    supplier_id: 2,
    custom_fields: {
      ram: '8GB',
      storage: '512GB SSD',
      color: 'Silver'
    }
  }
]

export const mockErrorResponses = {
  EMAIL_ALREADY_EXISTS: {
    error_code: 'EMAIL_ALREADY_EXISTS',
    detail: 'Email already registered'
  },
  USERNAME_ALREADY_EXISTS: {
    error_code: 'USERNAME_ALREADY_EXISTS',
    detail: 'Username already taken'
  },
  INVALID_CREDENTIALS: {
    error_code: 'INVALID_CREDENTIALS',
    detail: 'Invalid email or password'
  },
  TOKEN_REQUIRED: {
    error_code: 'TOKEN_REQUIRED',
    detail: 'Authentication token required'
  },
  INVALID_TOKEN: {
    error_code: 'INVALID_TOKEN',
    detail: 'Invalid or expired token'
  },
  CATEGORY_NOT_FOUND: {
    error_code: 'CATEGORY_NOT_FOUND',
    detail: 'Category not found'
  }
}
