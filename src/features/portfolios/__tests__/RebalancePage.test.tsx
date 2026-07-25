import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { RebalancePage } from '../RebalancePage'

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/portfolios/rebalance" element={<RebalancePage />} />
    </Routes>,
    { initialEntries: ['/portfolios/rebalance'] },
  )
}

async function waitForLoaded() {
  // The account list only renders once accounts have loaded; the drift-threshold input is part
  // of the same card header and is present as soon as the skeleton clears.
  return screen.findByLabelText(/Drift threshold/)
}

describe('RebalancePage — Select Accounts step', () => {
  // C24/C25 · Important #5 — the drift-threshold control used to default to 3.0, which is
  // tighter than most model bands (5%/7%), so `Math.min(band, 3% )` collapsed every account back
  // onto the flat 3% list this task exists to remove. Defaulting to the top of the control's
  // range (10%, above the widest band of 7%) means the per-model bands bind unclipped: the
  // account list matches the 40 accounts the rest of the app marks `needsRebalance`, not 41.
  it('defaults to the per-model bands, not a flat 3% floor: 40 accounts listed, matching needsRebalance elsewhere', async () => {
    renderPage()
    await waitForLoaded()

    const rows = await screen.findAllByText(/% drift$/)
    expect(rows).toHaveLength(40)
  })

  // C25 — acc-047 (mod-007, 5% band) has a worst asset-class drift of exactly 5%: not eligible
  // under its own band, so it must be absent from the default list...
  it('acc-047 (exactly at its own 5% band) is absent from the default list', async () => {
    renderPage()
    await waitForLoaded()

    expect(screen.queryByText('David Williams SIMPLE IRA')).not.toBeInTheDocument()
  })

  // ...but entering a tighter global threshold (3%, below acc-047's 5% band) makes it eligible —
  // proving the control is wired to the list and not a decorative no-op (C25's original defect).
  it('lowering the drift threshold below an account\'s own band adds it to the list', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitForLoaded()

    const thresholdInput = screen.getByLabelText(/Drift threshold/)
    await user.clear(thresholdInput)
    await user.type(thresholdInput, '3')

    expect(await screen.findByText('David Williams SIMPLE IRA')).toBeInTheDocument()
  })

  // C24/C25 · Important #2 — the "select by model" checkbox rows used to filter on the raw
  // server `needsRebalance` flag, ignoring the threshold entirely, while the model card's "N
  // drifted" badge (and the ids actually placed into `selectedIds`) used the threshold-aware
  // list. With the threshold at 3% (below mod-007's 5% band), mod-007 has three eligible accounts
  // (acc-030, acc-037, acc-047) — the badge and the checkbox rows must agree, or a selected
  // account (acc-047) is invisible and cannot be deselected before it's submitted to the preview.
  it('model-mode badge count and checkbox rows agree once the threshold pulls in a third account', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitForLoaded()

    const thresholdInput = screen.getByLabelText(/Drift threshold/)
    await user.clear(thresholdInput)
    await user.type(thresholdInput, '3')

    await user.click(screen.getByRole('button', { name: 'Model' }))
    const modelCard = (await screen.findByText('Moderate Balanced')).closest('button')
    expect(modelCard).not.toBeNull()
    expect(within(modelCard!).getByText('3 drifted')).toBeInTheDocument()

    await user.click(modelCard!)

    expect(await screen.findByText("Brian O'Brien Individual")).toBeInTheDocument()
    expect(screen.getByText('William Foster Individual')).toBeInTheDocument()
    expect(screen.getByText('David Williams SIMPLE IRA')).toBeInTheDocument()
  })
})
