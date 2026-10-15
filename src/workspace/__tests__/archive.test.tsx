import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { actAsCco, approveProposal, createProposal, draftLetter, recordComplianceAct, sendToParty } from '@/services/workspace'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const summaryCell = (row: HTMLElement) => row.querySelectorAll('td')[1]?.textContent

async function session() {
  const detail = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  const fingerprint = detail.versions[0]!.fingerprint
  const approval = await approveProposal(ADRIAN, detail.id, 1, fingerprint)
  const draft = await draftLetter(ADRIAN, 'th-robert', detail.id)
  await sendToParty(ADRIAN, draft.id)
  await recordComplianceAct('cco-001', { kind: 'release_orders', proposalId: detail.id, approvalActId: approval.id, fingerprint, rationale: 'Reviewed.' })
}
async function archiveRows() {
  const table = await screen.findByRole('table', { name: 'Archive' })
  return within(table).getAllByRole('row').slice(1)
}

describe('the Archive', () => {
  it('lists every record in order with its record id, actor, fingerprint and thread, and filters by kind through the URL', async () => {
    await session()
    const { router } = renderRoutes(routes, '/archive')
    await screen.findByRole('heading', { level: 1, name: 'Archive' })
    const rows = await archiveRows()
    expect(rows.map(summaryCell)).toEqual([
      'REC-0001 · Approved v1 of the Johnson rebalance',
      'REC-0002 · Message sent to the client',
      'REC-0002 · Message to Robert Johnson',
      'REC-0003 · Released the orders staged from v1 of the Johnson rebalance',
    ])
    expect(rows[3]).toHaveTextContent('Mark Davis')
    expect(rows[3]).toHaveTextContent('Released the orders staged from v1 of the Johnson rebalance')
    expect(within(rows[3]!).getByRole('link', { name: 'Johnson Rebalance Review' })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(within(rows[2]!).getByRole('link', { name: 'Robert Johnson' })).toHaveAttribute('href', '/t/th-robert')
    await userEvent.setup().selectOptions(screen.getByLabelText('Kind'), 'Release orders')
    await waitFor(async () => expect((await archiveRows()).map(summaryCell)).toEqual(['REC-0003 · Released the orders staged from v1 of the Johnson rebalance']))
    expect(router.state.location.search).toBe('?kind=release_orders')
  })

  it('says what fills an empty archive', async () => {
    renderRoutes(routes, '/archive?kind=send_to_party')
    expect(await screen.findByText('Recorded acts appear here: approvals, releases, filings, deliveries and resolutions.')).toBeInTheDocument()
  })

  it('reads its filters from the URL', async () => {
    await session()
    renderRoutes(routes, '/archive?kind=send_to_party&partyId=cli-001&from=2026-02-25')
    await waitFor(async () => expect((await archiveRows()).map(summaryCell)).toEqual(['REC-0002 · Message sent to the client']))
    expect(screen.getByLabelText('Client or prospect')).toHaveValue('cli-001')
  })

  it('keeps a date from the URL selectable even when no record falls on it', async () => {
    await session()
    renderRoutes(routes, '/archive?from=2026-02-20&to=2026-02-27')
    await archiveRows()
    expect(screen.getByLabelText('From')).toHaveValue('2026-02-20')
    expect(screen.getByLabelText('To')).toHaveValue('2026-02-27')
  })

  it('names the presenter shortcut, and links an alert disposition to its Supervision item', async () => {
    await actAsCco(ADRIAN, { kind: 'alert', id: 'comp-002' })
    renderRoutes(routes, '/archive')
    const [row] = await archiveRows()
    expect(row).toHaveTextContent('Mark Davis · via the presenter shortcut')
    expect(within(row!).getByRole('link', { name: 'Supervision' })).toHaveAttribute('href', '/supervision/alert/comp-002')
  })

  it('Robert is told the archive does not exist', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/archive')
    expect(await screen.findByRole('heading', { level: 1, name: 'Archive not found' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Archive' })).toBeNull()
  })
})
