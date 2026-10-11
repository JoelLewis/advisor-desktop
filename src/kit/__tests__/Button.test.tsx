import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/kit/button/Button'
import { contrast, darkPalette, lightPalette, readAppCss } from '@/__tests__/guardrails/contrast'

describe('Button', () => {
  it('renders a button with its rank and handles clicks', async () => {
    const onClick = vi.fn()
    render(<Button rank="secondary" onClick={onClick}>Draft the client note</Button>)
    const b = screen.getByRole('button', { name: 'Draft the client note' })
    expect(b.dataset.rank).toBe('secondary')
    await userEvent.click(b)
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('asChild renders the child element with no type and keeps the rank', () => {
    render(<Button asChild rank="quiet"><a href="/clients">Open clients</a></Button>)
    const link = screen.getByRole('link', { name: 'Open clients' })
    expect(link.tagName).toBe('A')
    expect(link).not.toHaveAttribute('type')
    expect(link.dataset.rank).toBe('quiet')
  })
  it('defaults to primary and type=button', () => {
    render(<Button>Approve</Button>)
    const b = screen.getByRole('button')
    expect(b.dataset.rank).toBe('primary')
    expect(b).toHaveAttribute('type', 'button')
  })
  it('a disabled primary drops to a muted outline in contrast-checked tokens, never a faded block', () => {
    render(<Button disabled>Send to Robert</Button>)
    const b = screen.getByRole('button', { name: 'Send to Robert' })
    expect(b).toBeDisabled()
    expect(b.className).not.toMatch(/opacity/)
    for (const token of ['disabled:bg-transparent', 'disabled:text-ink-3', 'disabled:border-rule-2']) expect(b).toHaveClass(token)
    const css = readAppCss()
    for (const palette of [lightPalette(css), darkPalette(css)]) {
      for (const surface of ['bg', 'face'] as const) {
        expect(contrast(palette.get('ink-3')!, palette.get(surface)!)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(palette.get('rule-2')!, palette.get(surface)!)).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
