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
  it('names the client audience on client threads', () => {
    render(<VisibilityBand visibility="client" audience="Robert Johnson" />)
    expect(screen.getByText('Robert Johnson')).toBeInTheDocument()
  })
})
