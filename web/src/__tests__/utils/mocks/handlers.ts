import { http, HttpResponse } from 'msw'

const API_BASE = 'http://localhost:8000'

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as { email: string; username: string; password: string }
    
    // Simulate validation errors
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { error_code: 'EMAIL_ALREADY_EXISTS', detail: 'Email already registered' },
        { status: 400 }
      )
    }
    
    if (body.username === 'existinguser') {
      return HttpResponse.json(
        { error_code: 'USERNAME_ALREADY_EXISTS', detail: 'Username already taken' },
        { status: 400 }
      )
    }
    
    // Successful registration
    return HttpResponse.json({
      access_token: 'mock_access_token',
      token_type: 'bearer',
      user: {
        id: 1,
        email: body.email,
        username: body.username,
        role: 'BUYER'
      }
    }, { status: 201 })
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    // Mock successful login
    if (body.email === 'test@example.com' && body.password === 'testpassword') {
      return HttpResponse.json({
        access_token: 'mock_access_token',
        token_type: 'bearer',
        user: {
          id: 1,
          email: body.email,
          username: 'testuser',
          role: 'BUYER'
        }
      })
    }
    
    // Invalid credentials
    return HttpResponse.json(
      { error_code: 'INVALID_CREDENTIALS', detail: 'Invalid email or password' },
      { status: 401 }
    )
  }),

  http.get(`${API_BASE}/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error_code: 'TOKEN_REQUIRED', detail: 'Authentication token required' },
        { status: 401 }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    if (token !== 'mock_access_token') {
      return HttpResponse.json(
        { error_code: 'INVALID_TOKEN', detail: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      role: 'BUYER'
    })
  }),

  // Categories endpoints
  http.get(`${API_BASE}/categories`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        subcategories: [
          { id: 1, name: 'Smartphones', description: 'Mobile phones' },
          { id: 2, name: 'Laptops', description: 'Portable computers' }
        ]
      },
      {
        id: 2,
        name: 'Clothing',
        description: 'Fashion and apparel',
        subcategories: [
          { id: 3, name: 'Men\'s Clothing', description: 'Clothing for men' },
          { id: 4, name: 'Women\'s Clothing', description: 'Clothing for women' }
        ]
      }
    ])
  }),

  // Health check
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'ok' })
  }),

  // Fallback for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  })
]
