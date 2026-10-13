import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'

describe('the fills message', () => {
  it('lists each fill with side, quantity, price, value and time, and names the release', async () => {
    store().messages.push({
      kind: 'fills', id: 'msg-0099', threadId: 'th-johnson-review', at: '2026-02-25T14:35:00.000Z', proposalId: 'prop-0001',
      title: 'Johnson rebalance', version: 3, releaseActId: 'REC-0003',
      fills: [
        { id: 'fill-0001', stagedOrderId: 'stg-0001', proposalId: 'prop-0001', version: 3, accountId: 'acc-002', symbol: 'INTC', name: 'Intel Corp.', side: 'sell', quantity: 7000, price: 28.45, value: 199150, currency: 'USD', at: '2026-02-25T14:30:00.000Z' },
        { id: 'fill-0002', stagedOrderId: 'stg-0003', proposalId: 'prop-0001', version: 3, accountId: 'acc-002', symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', side: 'buy', quantity: 1388, price: 44.8, value: 62182.4, currency: 'USD', at: '2026-02-25T14:31:00.000Z' },
      ],
    })
    renderRoutes(routes, '/t/th-johnson-review')
    const report = await screen.findByRole('article', { name: 'Fills · Johnson rebalance v3' })
    expect(report).toHaveTextContent("Released by REC-0003; filled at the day's prices.")
    const table = within(report).getByRole('table', { name: 'Fills · v3' })
    const [intc, vwo] = within(table).getAllByRole('row').slice(1)
    for (const text of ['INTC', 'Sold', '7,000', '28.45', '199,150', '2026-02-25 14:30 UTC']) expect(intc).toHaveTextContent(text)
    for (const text of ['VWO', 'Bought', '1,388', '44.80', '62,182', '2026-02-25 14:31 UTC']) expect(vwo).toHaveTextContent(text)
  })
})
