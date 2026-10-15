import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { LiveThreadFeed } from '@/workspace/thread/LiveThreadFeed'

describe('LiveThreadFeed band', () => {
  it('names the prospect a prospect work thread is about', async () => {
    sessionStorage.setItem('ws-viewer', 'user-001')
    renderWithProviders(<LiveThreadFeed threadId="th-pell-work" />)
    expect(await screen.findByRole('note', { name: `Visibility: Larkfield team · Dr. Pell can't see this` })).toBeInTheDocument()
  })
  it("names the client whose account a team thread is about", async () => {
    sessionStorage.setItem('ws-viewer', 'user-001')
    renderWithProviders(<LiveThreadFeed threadId="th-johnson-review" />)
    expect(await screen.findByRole('note', { name: `Visibility: Larkfield team · Robert can't see this` })).toBeInTheDocument()
  })
})
