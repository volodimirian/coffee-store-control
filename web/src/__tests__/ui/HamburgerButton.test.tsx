import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '#/utils/test-utils'
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
  })

  it('calls onClick when clicked', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={false} onClick={mockOnClick} />)

    const button = screen.getByRole('button', { name: /toggle menu/i })
    fireEvent.mouseDown(button)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('prevents default and stops propagation on mouse down', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={false} onClick={mockOnClick} />)

    const button = screen.getByRole('button', { name: /toggle menu/i })
    const mockEvent = new MouseEvent('mousedown', { bubbles: true })
    const preventDefaultSpy = vi.spyOn(mockEvent, 'preventDefault')
    const stopPropagationSpy = vi.spyOn(mockEvent, 'stopPropagation')

    fireEvent(button, mockEvent)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(stopPropagationSpy).toHaveBeenCalled()
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('has correct CSS classes for closed state', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={false} onClick={mockOnClick} />)

    const button = screen.getByRole('button')
    const spans = button.querySelectorAll('span')

    expect(spans).toHaveLength(3)
    expect(spans[0]).not.toHaveClass('rotate-45', 'translate-y-1.5')
    expect(spans[1]).not.toHaveClass('opacity-0')
    expect(spans[2]).not.toHaveClass('-rotate-45', '-translate-y-1.5')
  })

  it('has correct CSS classes for open state', () => {
    const mockOnClick = vi.fn()
    render(<HamburgerButton isOpen={true} onClick={mockOnClick} />)

    const button = screen.getByRole('button')
    const spans = button.querySelectorAll('span')

    expect(spans).toHaveLength(3)
    expect(spans[0]).toHaveClass('rotate-45', 'translate-y-1.5')
    expect(spans[1]).toHaveClass('opacity-0')
    expect(spans[2]).toHaveClass('-rotate-45', '-translate-y-1.5')
  })
})
