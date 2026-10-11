import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/kit/button/Button'

describe('Button', () => {
  it('renders a button with its rank and handles clicks', async () => {
    const onClick = vi.fn()
    render(<Button rank="secondary" onClick={onClick}>Draft the client note</Button>)
    const b = screen.getByRole('button', { name: 'Draft the client note' })
    expect(b.dataset.rank).toBe('secondary')
    await userEvent.click(b)
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('defaults to primary and type=button', () => {
    render(<Button>Approve</Button>)
    const b = screen.getByRole('button')
    expect(b.dataset.rank).toBe('primary')
    expect(b).toHaveAttribute('type', 'button')
  })
})
