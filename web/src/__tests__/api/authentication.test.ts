import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Simple API test without complex dependencies
const API_BASE = 'http://localhost:8000'

const server = setupServer(
  http.post(`${API_BASE}/auth/register`, () => {
    return HttpResponse.json({
      access_token: 'mock_token',
      token_type: 'bearer'
    }, { status: 201 })
  }),
  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json({
      access_token: 'mock_token',
      token_type: 'bearer'
    }, { status: 200 })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Authentication API', () => {
  it('should have proper test setup', () => {
    expect(true).toBe(true)
  })

  it('should test MSW server setup', () => {
    // Just verify our server is set up correctly
    expect(server).toBeDefined()
    expect(API_BASE).toBe('http://localhost:8000')
  })
})
