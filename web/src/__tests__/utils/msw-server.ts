import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { mockCategories, mockErrorResponses } from './fixtures'

const API_BASE = 'http://localhost:8000'

export const server = setupServer(
  // Health endpoint
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'ok' }, { status: 200 })
  }),

  // Auth endpoints
  http.post(`${API_BASE}/auth/register`, () => {
    return HttpResponse.json(
      { 
        access_token: 'mock_access_token',
        token_type: 'bearer'
      },
      { status: 201 }
    )
  }),

  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json(
      { 
        access_token: 'mock_access_token',
        token_type: 'bearer'
      },
      { status: 200 }
    )
  }),

  // Categories endpoints  
  http.get(`${API_BASE}/categories`, () => {
    return HttpResponse.json(mockCategories.slice(0, 2), { status: 200 })
  }),

  http.get(`${API_BASE}/categories/:id`, ({ params }) => {
    const id = parseInt(params.id as string)
    const category = mockCategories.find(c => c.id === id)
    if (!category) {
      return HttpResponse.json(mockErrorResponses.CATEGORY_NOT_FOUND, { status: 404 })
    }
    return HttpResponse.json(category, { status: 200 })
  }),

  http.post(`${API_BASE}/categories`, async ({ request }) => {
    const body = await request.json() as { name: string; description: string }
    const newCategory = {
      id: mockCategories.length + 1,
      ...body,
      subcategories: []
    }
    return HttpResponse.json(newCategory, { status: 201 })
  }),

  http.put(`${API_BASE}/categories/:id`, async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const body = await request.json() as { name?: string; description?: string }
    const category = mockCategories.find(c => c.id === id)
    if (!category) {
      return HttpResponse.json(mockErrorResponses.CATEGORY_NOT_FOUND, { status: 404 })
    }
    const updatedCategory = { ...category, ...body }
    return HttpResponse.json(updatedCategory, { status: 200 })
  }),

  http.delete(`${API_BASE}/categories/:id`, ({ params }) => {
    const id = parseInt(params.id as string)
    const category = mockCategories.find(c => c.id === id)
    if (!category) {
      return HttpResponse.json(mockErrorResponses.CATEGORY_NOT_FOUND, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // Subcategory endpoints
  http.get(`${API_BASE}/categories/:categoryId/subcategories`, ({ params }) => {
    const categoryId = parseInt(params.categoryId as string)
    const category = mockCategories.find(c => c.id === categoryId)
    if (!category) {
      return HttpResponse.json(mockErrorResponses.CATEGORY_NOT_FOUND, { status: 404 })
    }
    return HttpResponse.json(category.subcategories, { status: 200 })
  }),

  http.post(`${API_BASE}/subcategories`, async ({ request }) => {
    const body = await request.json() as { name: string; description: string; category_id: number }
    const newSubcategory = {
      id: 100 + Math.floor(Math.random() * 100),
      ...body
    }
    return HttpResponse.json(newSubcategory, { status: 201 })
  }),

  http.put(`${API_BASE}/subcategories/:id`, async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const body = await request.json() as { name?: string; description?: string }
    const updatedSubcategory = {
      id,
      ...body
    }
    return HttpResponse.json(updatedSubcategory, { status: 200 })
  }),

  http.delete(`${API_BASE}/subcategories/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  })
)

// Helper for test setup
export const startMockServer = () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}
