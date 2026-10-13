import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { LiveThreadFeed } from '@/workspace/thread/LiveThreadFeed'

describe('LiveThreadFeed band', () => {
  it("reads the prospect's words on a prospect work thread", async () => {
    sessionStorage.setItem('ws-viewer', 'user-001')
    renderWithProviders(<LiveThreadFeed threadId="th-pell-work" />)
    expect(await screen.findByRole('note', { name: "Visibility: Firm only · prospect can't see" })).toBeInTheDocument()
  })
  it('keeps the client words on a client-related internal thread', async () => {
    sessionStorage.setItem('ws-viewer', 'user-001')
    renderWithProviders(<LiveThreadFeed threadId="th-johnson-review" />)
    expect(await screen.findByRole('note', { name: "Visibility: Firm only · client can't see" })).toBeInTheDocument()
  })
})
