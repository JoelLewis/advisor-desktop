import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, draftLetter, getProposal, saveProposalVersion, sendToParty } from '@/services/workspace'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

async function approved() {
  const detail = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  await approveProposal(ADRIAN, detail.id, 1, detail.versions[0]!.fingerprint)
  return detail.versions[0]!.fingerprint
}
async function open(path: string) {
  renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: 'Supervision' })
  return within(screen.getByRole('navigation', { name: 'Supervision queue' }))
}

describe('Supervision', () => {
  it('Mark reads the queue in its groups and opens the orders evidence beside it', async () => {
    const fingerprint = await approved()
    viewAsOnLoad('cco-001')
    const queue = await open('/supervision')
    for (const group of ['Orders awaiting release', 'Open alerts', 'Correspondence to review', 'Disposed today']) {
      expect(queue.getByRole('heading', { name: group })).toBeInTheDocument()
    }
    expect(screen.getByText(/^Choose an item from the queue: its evidence/)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Threads' })).toBeNull()
    await userEvent.setup().click(queue.getByRole('link', { name: /^Johnson rebalance · v1/ }))
    const item = await screen.findByRole('region', { name: 'Orders · Johnson rebalance · v1' })
    for (const text of [fingerprint, 'Adrian Hale, Advisor', 'REC-0001', 'This is the record of what was approved. The checks are not run again here.', 'PENDING COMPLIANCE REVIEW']) {
      expect(item).toHaveTextContent(text)
    }
    expect(within(item).getByRole('table', { name: 'Approved legs · v1' })).toBeInTheDocument()
    expect(within(item).getByRole('link', { name: /Team thread/ })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(within(item).getByRole('link', { name: /Workbench/ })).toHaveAttribute('href', '/proposals/prop-0001?from=th-johnson-review')
    expect(item).not.toHaveTextContent('is newer and unapproved')
  })

  it('says so when a newer, unapproved version exists than the one approved', async () => {
    await approved()
    const symbol = (await getProposal(ADRIAN, 'prop-0001')).versions[0]!.preview.trades[0]!.symbol
    await saveProposalVersion(ADRIAN, 'prop-0001', [{ kind: 'exclude', symbol }])
    viewAsOnLoad('cco-001')
    const queue = await open('/supervision')
    await userEvent.setup().click(queue.getByRole('link', { name: /^Johnson rebalance · v1/ }))
    const item = await screen.findByRole('region', { name: 'Orders · Johnson rebalance · v1' })
    expect(item).toHaveTextContent('v2 is newer and unapproved; these orders are from v1.')
  })

  it('opens the MSFT alert with its record trail and account context', async () => {
    viewAsOnLoad('cco-001')
    await open('/supervision/alert/comp-002')
    const item = await screen.findByRole('region', { name: 'Alert · Single-name concentration — MSFT in Johnson Trust' })
    expect(within(item).getByRole('list', { name: 'Record trail' })).toHaveTextContent('Under Review')
    expect(within(item).getByRole('list', { name: 'Record trail' })).toHaveTextContent('Mark Davis (CCO)')
    expect(within(item).getByRole('list', { name: 'Reviewer notes' })).toHaveTextContent('sr-003')
    expect(item).toHaveTextContent('Johnson Family Trust')
  })

  it("opens a sent letter as Robert saw it, with the firm-only provenance", async () => {
    await approved()
    const draft = await draftLetter(ADRIAN, 'th-robert', 'prop-0001')
    const act = await sendToParty(ADRIAN, draft.id)
    viewAsOnLoad('cco-001')
    await open(`/supervision/correspondence/${act.messageId}`)
    const item = await screen.findByRole('region', { name: 'Correspondence · Message to Robert Johnson' })
    expect(item).toHaveTextContent('Dear Robert,')
    expect(within(item).getByRole('note', { name: `Visibility: Larkfield team · Robert can't see this` })).toBeInTheDocument()
    expect(item).toHaveTextContent(/from v1 · fingerprint .* · agent draft, unedited/)
  })

  it('says what fills each empty group and how the demo fills it', async () => {
    renderRoutes(routes, '/supervision')
    expect(await screen.findByText('Orders appear here once an advisor approves a proposal (Johnson Rebalance Review → Approve).')).toBeInTheDocument()
    expect(screen.getByText('Sent client messages appear here for review.')).toBeInTheDocument()
    expect(screen.getByText(/^Choose an item from the queue: its evidence/)).toBeInTheDocument()
  })

  it('a client is told /supervision does not exist either', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/supervision')
    expect(await screen.findByRole('heading', { level: 1, name: 'Supervision not found' })).toBeInTheDocument()
  })

  it('an item not in the queue says so', async () => {
    await open('/supervision/orders/prop-9999')
    expect(screen.getByText("This item is not in the queue. It may have been disposed of on another day, withdrawn by the advisor, or never existed. This demo's state resets when the page reloads.")).toBeInTheDocument()
  })

  it('Robert is told Supervision does not exist, and the thread list never offers it to him', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/supervision/orders/prop-0001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Supervision not found' })).toBeInTheDocument()
  })

  it("Mark's thread context links his pending orders to their Supervision item", async () => {
    await approved()
    viewAsOnLoad('cco-001')
    renderRoutes(routes, '/t/th-johnson-review')
    const panel = await within(await screen.findByRole('complementary', { name: 'Details' })).findByRole('region', { name: 'Approval · Johnson rebalance' })
    expect(within(panel).getByRole('link', { name: /Review in Supervision/ })).toHaveAttribute('href', '/supervision/orders/prop-0001')
    expect(within(panel).queryByRole('button')).toBeNull()
  })
})
