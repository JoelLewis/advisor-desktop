import { it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderRoutes } from '@/test/render'
import { fmtMoney } from '@/kit/measure'
import { preTradeCheckProposal, previewRebalance } from '@/services/oms'
import { RebalanceEmbed } from '@/workspace/thread/embeds/RebalanceEmbed'
import { DriftEmbed } from '@/workspace/thread/embeds/DriftEmbed'
import { accountIdOf } from '@/workspace/thread/embeds/embed-props'

const STATUS = { block: 'BLOCK', warning: 'WARN', pass: 'CLEAR' } as const

it("lists the preview's legs with each leg's pre-trade status, and the gross traded total", async () => {
  const [preview] = await previewRebalance('user-001', { accountIds: ['acc-002'], taxAware: true })
  if (!preview) throw new Error('no preview for acc-002')
  const check = await preTradeCheckProposal('user-001', {
    accountId: 'acc-002',
    trades: preview.trades.map(({ symbol, side, quantity, estimatedValue }) => ({ symbol, side, quantity, estimatedValue })),
  })
  renderRoutes([{ path: '/', element: <RebalanceEmbed subject={{ type: 'account', id: 'acc-002' }} /> }], '/')
  const embed = await screen.findByRole('region', { name: 'Rebalance preview · Robert Johnson · Individual (…3847)' })
  const table = within(embed).getByRole('table', { name: 'Rebalance legs · Robert Johnson · Individual (…3847)' })
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
  expect(totals).not.toHaveTextContent('ties to')
  expect(totals).toHaveTextContent(fmtMoney(gross))
  expect(within(table).getByRole('columnheader', { name: `Value ${preview.currency}` })).toBeInTheDocument()
  expect(within(embed).getByRole('link', { name: 'Open account' })).toHaveAttribute('href', '/accounts/acc-002')
  expect(embed).toHaveTextContent('does not count working orders; a proposal does')
})

it('a non-account subject is an explicit error', () => {
  expect(() => accountIdOf({ type: 'client', id: 'cli-001' }, 'rebalance preview')).toThrow(/rebalance preview embed needs an account subject/)
})

it('its full-view link remembers the thread it sits in', async () => {
  renderRoutes([{ path: '/', element: <RebalanceEmbed subject={{ type: 'account', id: 'acc-002' }} threadId="th-johnson-review" /> }], '/')
  const embed = await screen.findByRole('region', { name: 'Rebalance preview · Robert Johnson · Individual (…3847)' })
  expect(within(embed).getByRole('link', { name: 'Open account' })).toHaveAttribute('href', '/accounts/acc-002?from=th-johnson-review')
})

it('the drift embed beside it names the account as its link and the context column do', async () => {
  renderRoutes([{ path: '/', element: <DriftEmbed subject={{ type: 'account', id: 'acc-002' }} threadId="th-johnson-review" /> }], '/')
  expect(await screen.findByRole('region', { name: 'Drift against model · Robert Johnson · Individual (…3847)' })).toBeInTheDocument()
})
