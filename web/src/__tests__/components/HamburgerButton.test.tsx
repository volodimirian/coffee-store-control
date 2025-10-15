import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '#/utils/test-utils'
import userEvent from '@testing-library/user-event'
import HamburgerButton from '~/shared/ui/HamburgerButton'

describe('HamburgerButton', () => {
  it('renders correctly when closed', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={false} onClick={mockOnClick} />)
    
    const button = screen.getByRole('button', { name: /toggle menu/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Toggle menu')
  })

  it('renders correctly when open', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={true} onClick={mockOnClick} />)
    
    const button = screen.getByRole('button', { name: /toggle menu/i })
    expect(button).toBeInTheDocument()
    
    // Check for transformed spans (X shape when open)
    const spans = button.querySelectorAll('span')
    expect(spans).toHaveLength(3)
  })

  it('calls onClick when clicked', async () => {
    const mockOnClick = vi.fn()
    const user = userEvent.setup()
    
    render(<HamburgerButton isOpen={false} onClick={mockOnClick} />)
    
    const button = screen.getByRole('button', { name: /toggle menu/i })
    await user.click(button)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('applies correct CSS classes for closed state', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={false} onClick={mockOnClick} />)
    
    const button = screen.getByRole('button')
    const spans = button.querySelectorAll('span')
    
    // First span should not have rotation
    expect(spans[0]).not.toHaveClass('rotate-45')
    // Second span should be visible (not opacity-0)
    expect(spans[1]).not.toHaveClass('opacity-0')
    // Third span should not have rotation
    expect(spans[2]).not.toHaveClass('-rotate-45')
  })

  it('applies correct CSS classes for open state', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={true} onClick={mockOnClick} />)
    
    const button = screen.getByRole('button')
    const spans = button.querySelectorAll('span')
    
    // Check that transform classes are applied for X shape
    expect(spans[0]).toHaveClass('rotate-45')
    expect(spans[1]).toHaveClass('opacity-0')
    expect(spans[2]).toHaveClass('-rotate-45')
  })

  it('has proper accessibility attributes', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={false} onClick={mockOnClick} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Toggle menu')
  })
})
