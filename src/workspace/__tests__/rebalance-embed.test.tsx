import { it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderRoutes } from '@/test/render'
import { fmtMoney } from '@/kit/measure'
import { preTradeCheckProposal, previewRebalance } from '@/services/oms'
import { RebalanceEmbed } from '@/workspace/thread/embeds/RebalanceEmbed'
import { accountIdOf } from '@/workspace/thread/embeds/embed-props'

const STATUS = { block: 'BLOCK', warning: 'WARN', pass: 'CLEAR' } as const

it("lists the preview's legs with each leg's pre-trade status, totals tying to the preview", async () => {
  const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
  if (!preview) throw new Error('no preview for acc-002')
  const check = await preTradeCheckProposal({
    accountId: 'acc-002',
    trades: preview.trades.map(({ symbol, side, quantity, estimatedValue }) => ({ symbol, side, quantity, estimatedValue })),
  })
  renderRoutes([{ path: '/', element: <RebalanceEmbed subject={{ type: 'account', id: 'acc-002' }} /> }], '/')
  const embed = await screen.findByRole('region', { name: 'Rebalance preview · Robert Johnson Individual' })
  const table = within(embed).getByRole('table', { name: 'Rebalance legs · Robert Johnson Individual' })
  const rows = within(table).getAllByRole('row').slice(1, -1)
  expect(rows).toHaveLength(preview.trades.length)
  preview.trades.forEach((trade, i) => {
    const row = rows[i] as HTMLElement
    expect(within(row).getAllByRole('cell')[0]).toHaveTextContent(trade.symbol)
    expect(row).toHaveTextContent(fmtMoney(trade.estimatedValue))
    const severity = check.legs.find((l) => l.index === i)?.severity
    if (!severity) throw new Error(`no check for leg ${i}`)
    expect(row.querySelector('[data-status]')).toHaveAttribute('data-status', STATUS[severity])
  })
  const gross = preview.trades.reduce((s, t) => s + t.estimatedValue, 0)
  const allRows = within(table).getAllByRole('row')
  const totals = allRows[allRows.length - 1] as HTMLElement
  expect(totals).toHaveTextContent('Gross traded')
  expect(totals).toHaveTextContent('ties to the preview')
  expect(totals).toHaveTextContent(fmtMoney(gross))
  expect(within(table).getByRole('columnheader', { name: `Value ${preview.currency}` })).toBeInTheDocument()
  expect(within(embed).getByRole('link', { name: 'Open full view' })).toHaveAttribute('href', '/accounts/acc-002')
})

it('a non-account subject is an explicit error', () => {
  expect(() => accountIdOf({ type: 'client', id: 'cli-001' }, 'rebalance preview')).toThrow(/rebalance preview embed needs an account subject/)
})
