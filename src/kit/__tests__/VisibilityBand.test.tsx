import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { VISIBILITY_WORDS } from '@/kit/visibility/visibility'

describe('VisibilityBand', () => {
  it('uses the exact words', () => {
    expect(VISIBILITY_WORDS).toEqual({ private: 'Only you', internal: "Firm only · client can't see", client: 'CLIENT CAN SEE' })
  })
  it.each(['private', 'internal', 'client'] as const)('%s announces who can see it at both scales', (v) => {
    const { unmount } = render(<VisibilityBand visibility={v} scale="thread" audience="Robert Johnson" />)
    expect(screen.getByRole('note', { name: `Visibility: ${VISIBILITY_WORDS[v]}` })).toHaveAttribute('data-visibility', v)
    expect(screen.getByText(VISIBILITY_WORDS[v])).toBeInTheDocument()
    unmount()
    render(<VisibilityBand visibility={v} scale="message" />)
    expect(screen.getByText(VISIBILITY_WORDS[v])).toBeInTheDocument()
  })
  it('internal rule keeps a double-rule fallback when the hatch background is dropped', () => {
    const { container } = render(<VisibilityBand visibility="internal" />)
    const rule = container.querySelector('[aria-hidden]')
    expect(rule).toHaveClass('hatch', 'border-y')
  })
  it('hides the visible word from assistive tech while the note name holds it', () => {
    render(<VisibilityBand visibility="client" />)
    expect(screen.getByText(VISIBILITY_WORDS.client)).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('note')).toHaveAccessibleName(`Visibility: ${VISIBILITY_WORDS.client}`)
  })
  it('names the client audience on client threads', () => {
    render(<VisibilityBand visibility="client" audience="Robert Johnson" />)
    expect(screen.getByText('Robert Johnson')).toBeInTheDocument()
  })
})
