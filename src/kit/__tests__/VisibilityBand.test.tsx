import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'

const WORDS = { private: 'Just you', internal: "Larkfield team · Robert can't see this", client: 'Robert Johnson can read this' } as const

describe('VisibilityBand', () => {
  it.each(['private', 'internal', 'client'] as const)('%s announces the words it is given at both scales', (v) => {
    const { unmount } = render(<VisibilityBand visibility={v} words={WORDS[v]} scale="thread" />)
    expect(screen.getByRole('note', { name: `Visibility: ${WORDS[v]}` })).toHaveAttribute('data-visibility', v)
    expect(screen.getByText(WORDS[v])).toBeInTheDocument()
    unmount()
    render(<VisibilityBand visibility={v} words={WORDS[v]} scale="message" />)
    expect(screen.getByRole('note', { name: `Visibility: ${WORDS[v]}` })).toHaveAttribute('data-scale', 'message')
  })
  it('internal rule keeps a double-rule fallback when the hatch background is dropped', () => {
    const { container } = render(<VisibilityBand visibility="internal" words={WORDS.internal} />)
    const rule = container.querySelector('[aria-hidden]')
    expect(rule).toHaveClass('hatch', 'border-y')
  })
  it('hides the visible words from assistive tech while the note name holds them', () => {
    render(<VisibilityBand visibility="client" words={WORDS.client} />)
    expect(screen.getByText(WORDS.client)).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('note')).toHaveAccessibleName(`Visibility: ${WORDS.client}`)
  })
  it.each(['private', 'internal', 'client'] as const)('only a client-visible band is filled (%s)', (v) => {
    render(<VisibilityBand visibility={v} words={WORDS[v]} />)
    if (v === 'client') expect(screen.getByRole('note')).toHaveClass('bg-shared')
    else expect(screen.getByRole('note')).not.toHaveClass('bg-shared')
  })
})
