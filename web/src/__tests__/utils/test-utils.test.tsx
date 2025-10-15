import { describe, it, expect } from 'vitest'
import { render, screen } from '#/utils/test-utils'

// Simple component for testing
function TestComponent() {
  return <div data-testid="test-component">Hello Test</div>
}

describe('Test Utils', () => {
  it('should render components correctly', () => {
    render(<TestComponent />)
    
    expect(screen.getByTestId('test-component')).toBeInTheDocument()
    expect(screen.getByText('Hello Test')).toBeInTheDocument()
  })

  it('should have BrowserRouter context', () => {
    render(
      <div>
        <a href="/test">Test Link</a>
      </div>
    )
    
    expect(screen.getByText('Test Link')).toBeInTheDocument()
  })
})
