import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { visibilityWords } from '@/kit/visibility/visibility'

describe('VisibilityBand', () => {
  it('uses the exact words', () => {
    expect(['private', 'internal', 'client'].map((v) => visibilityWords(v as 'private' | 'internal' | 'client'))).toEqual(['Only you', "Firm only · client can't see", 'CLIENT CAN SEE'])
  })
  it.each(['private', 'internal', 'client'] as const)('%s announces who can see it at both scales', (v) => {
    const { unmount } = render(<VisibilityBand visibility={v} scale="thread" audience="Robert Johnson" />)
    expect(screen.getByRole('note', { name: `Visibility: ${visibilityWords(v)}` })).toHaveAttribute('data-visibility', v)
    expect(screen.getByText(visibilityWords(v))).toBeInTheDocument()
    unmount()
    render(<VisibilityBand visibility={v} scale="message" />)
    expect(screen.getByText(visibilityWords(v))).toBeInTheDocument()
  })
  it('internal rule keeps a double-rule fallback when the hatch background is dropped', () => {
    const { container } = render(<VisibilityBand visibility="internal" />)
    const rule = container.querySelector('[aria-hidden]')
    expect(rule).toHaveClass('hatch', 'border-y')
  })
  it('hides the visible word from assistive tech while the note name holds it', () => {
    render(<VisibilityBand visibility="client" />)
    expect(screen.getByText(visibilityWords('client'))).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('note')).toHaveAccessibleName(`Visibility: ${visibilityWords('client')}`)
  })
  it('names the client audience on client threads', () => {
    render(<VisibilityBand visibility="client" audience="Robert Johnson" />)
    expect(screen.getByText('Robert Johnson')).toBeInTheDocument()
  })
})

describe('the band names the party', () => {
  it('reads the client words by default and the prospect words for prospect work', () => {
    expect(visibilityWords('client')).toBe('CLIENT CAN SEE')
    expect(visibilityWords('client', 'prospect')).toBe('PROSPECT CAN SEE')
    expect(visibilityWords('internal', 'prospect')).toBe("Firm only · prospect can't see")
    expect(visibilityWords('private', 'prospect')).toBe('Only you')
  })
  it('renders the prospect band with its accessible name', () => {
    render(<VisibilityBand visibility="client" party="prospect" audience="Dr. Amanda Pell" />)
    expect(screen.getByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toHaveTextContent('Dr. Amanda Pell')
  })
})
