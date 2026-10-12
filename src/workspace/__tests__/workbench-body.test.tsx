import { describe, it, expect } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { createProposal } from '@/services/workspace'

async function openWorkbench() {
  await createProposal('user-001', 'th-johnson-review', 'acc-002')
  renderRoutes(routes, '/proposals/prop-0001?from=th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
  return screen.findByRole('table', { name: 'Legs · v1' })
}

describe('the workbench body', () => {
  it('shows every leg with name, side, quantity, value, realised result by character, washed part, restriction and pre-trade', async () => {
    const legs = await openWorkbench()
    expect(within(legs).getAllByRole('row')).toHaveLength(10)
    const intc = within(legs).getByRole('row', { name: /^INTC/ })
    expect(intc).toHaveTextContent('Intel Corp.')
    expect(intc).toHaveTextContent('7,000')
    expect(intc).toHaveTextContent('2026-03-27')
    expect(intc).toHaveTextContent('CLEAR')
  })

  it('Enter on a sell leg shows its lots, the ones it sells selected', async () => {
    const legs = await openWorkbench()
    const spy = within(legs).getByRole('row', { name: /^SPY/ })
    act(() => spy.focus())
    await userEvent.keyboard('{Enter}')
    const detail = await screen.findByRole('region', { name: 'Leg · SPY' })
    expect(within(detail).getByRole('checkbox', { name: /^lot-pos-020-0/ })).toBeChecked()
    expect(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ })).not.toBeChecked()
    expect(within(detail).getByRole('textbox', { name: 'Quantity sh' })).toHaveValue('758')
  })

  it('summarises the tax, the drift before and after, the restrictions and the held-away accounts', async () => {
    await openWorkbench()
    const tape = await screen.findByRole('region', { name: 'Tax effect estimate' })
    expect(tape).toHaveTextContent('10,422')
    expect(tape).toHaveTextContent('Nets this proposal')
    expect(await screen.findByRole('region', { name: 'Drift after' })).toHaveTextContent('no market to sell into')
    expect(screen.getByRole('region', { name: 'Drift before' })).toBeInTheDocument()
    const restrictions = screen.getByRole('region', { name: 'Repurchase restrictions' })
    expect(restrictions).toHaveTextContent('recorded · sale rs-001 of 2026-02-20 in acc-002')
    expect(restrictions).toHaveTextContent("projected · this proposal's sale in acc-002")
    const away = await screen.findByRole('region', { name: 'Held-away accounts' })
    expect(away).toHaveTextContent('Vanguard')
    expect(away).toHaveTextContent('NOT VISIBLE TO WASH-SALE CHECKS')
  })
})
