import { describe, it, expect, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes, renderWithProviders } from '@/test/render'
import { buildVersion } from '@/mocks/workspace/proposal-engine'
import { LegDetail } from '@/workspace/workbench/LegDetail'
import { createProposal } from '@/services/workspace'
import { MINUS } from '@/kit/measure'

async function openWorkbench() {
  await createProposal('user-001', 'th-johnson-review', 'acc-002')
  renderRoutes(routes, '/proposals/prop-0001?from=th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
  return screen.findByRole('grid', { name: 'Legs · v1' })
}

describe('the workbench body', () => {
  it('shows every leg with name, side, quantity, value, realized result by character, washed part, restriction and pre-trade', async () => {
    const legs = await openWorkbench()
    expect(within(legs).getAllByRole('row')).toHaveLength(10)
    const intc = within(legs).getByRole('row', { name: /^INTC/ })
    expect(intc).toHaveTextContent('Intel Corp.')
    expect(intc).toHaveTextContent('7,000')
    expect(intc).toHaveTextContent('27 Mar 2026')
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
    expect(within(detail).getByRole('textbox', { name: 'Quantity sh' })).toHaveValue('943')
    expect(within(detail).getByRole('heading', { level: 3, name: 'Leg · SPY' })).toBeInTheDocument()
    // What the leg takes from the lot, against what the lot holds: it ties to the leg's 943 sh and +86,352 LT.
    expect(within(detail).getByRole('checkbox', { name: /^lot-pos-020-0/ })).toHaveAccessibleName(
      'lot-pos-020-0 · bought 23 Aug 2024 · long-term · 943 of 1,515.332 sh · +86,352 of +138,761 USD')
    expect(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ })).toHaveAccessibleName(/2,363\.668 sh · \+216,446 USD · not sold$/)
  })

  it('summarizes the tax, the drift before and after, the restrictions and the held-away accounts', async () => {
    await openWorkbench()
    const tape = await screen.findByRole('region', { name: 'Tax effect estimate' })
    expect(tape).toHaveTextContent('14,454')
    expect(tape).toHaveTextContent('Nets this proposal')
    expect(tape).toHaveTextContent(`Year-to-date realized${MINUS}32,750`)
    expect(tape).toHaveTextContent('Net for the year+60,729')
    const drift = await screen.findByRole('table', { name: 'Drift before and after' })
    expect(drift).toHaveTextContent('no market to sell into')
    expect(within(drift).getAllByRole('row')).toHaveLength(10)
    const restrictions = screen.getByRole('region', { name: 'Wash-sale restrictions' })
    expect(within(restrictions).getAllByRole('heading', { name: 'Wash-sale restrictions' })).toHaveLength(1)
    expect(restrictions).toHaveTextContent('recorded · sale rs-001 of 20 Feb 2026 in acc-002')
    expect(restrictions).toHaveTextContent("projected · this proposal's sale in acc-002")
    const away = await screen.findByRole('region', { name: 'Held-away accounts' })
    expect(away).toHaveTextContent('Robert Johnson · Vanguard')
    expect(away).toHaveTextContent('Patricia Johnson · TIAA')
    expect(away).toHaveTextContent('joint filers count as one')
    expect(away).toHaveTextContent('NOT VISIBLE TO WASH-SALE CHECKS')
    expect(away).toHaveTextContent('In an IRA or Roth the loss is permanently disallowed; employer plans may be treated the same way.')
    expect(away).not.toHaveTextContent(/retirement account/)
    // Its own summary section, headed like the others rather than nested under the wash-sale taxpayer.
    expect(within(away).getByRole('heading', { level: 2, name: 'Held-away accounts' })).toBeInTheDocument()
  })
})

describe('the leg detail quantity', () => {
  it('does not commit what is not a number, and commits a typed quantity', async () => {
    const r = buildVersion('acc-002', [{ kind: 'avoid_self_wash' }], [])
    if (!r.ok) throw new Error(r.message)
    const onQuantity = vi.fn()
    renderWithProviders(<LegDetail accountId="acc-002" view={r.built} symbol="SPY" excluded={false} onQuantity={onQuantity} />)
    const field = screen.getByRole('textbox', { name: 'Quantity sh' })
    await userEvent.clear(field)
    await userEvent.type(field, '7O0{Enter}')
    expect(onQuantity).not.toHaveBeenCalled()
    await userEvent.clear(field)
    await userEvent.type(field, '700{Enter}')
    expect(onQuantity).toHaveBeenCalledWith(700)
  })
})
