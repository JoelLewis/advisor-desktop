import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { HouseholdDetailPage } from '../HouseholdDetailPage'

function renderPage(householdId = 'hh-003') {
  return renderWithProviders(
    <Routes>
      <Route path="/households/:householdId" element={<HouseholdDetailPage />} />
    </Routes>,
    { initialEntries: [`/households/${householdId}`] },
  )
}

describe('HouseholdDetailPage — Drift Summary', () => {
  // C24 review fix — "N asset classes over threshold" used to compare against a hardcoded 2%
  // regardless of the account's own model band, so an in-tolerance account (acc-011, mod-002, 5%
  // band) could report "2 asset classes over threshold" even though neither of its two >2% classes
  // (us_equity +3.0%, fixed_income -2.7%) exceeds its actual 5% band. Fixed to compare against
  // `drift.driftTolerance`, so it reports 0 here.
  it("acc-011: reports 0 asset classes over threshold when neither breach exceeds the account's own 5% band", async () => {
    const user = userEvent.setup()
    renderPage('hh-003')

    await screen.findByText('Williams Household')
    await user.click(screen.getByRole('tab', { name: /Portfolio/ }))

    // "David Williams Individual" also appears (as a plain caption span) once per position in the
    // household's "All Positions" table on this same tab — scope to the Drift Summary card's own
    // account-name <p> to avoid ambiguity.
    const accountName = await screen.findByText('David Williams Individual', { selector: 'p.text-body-strong' })
    const row = accountName.parentElement
    expect(row).not.toBeNull()
    expect(within(row!).getByText('0 asset classes over threshold')).toBeInTheDocument()
  })

  // C24 review fix — the drift figure shown per account used to be totalDrift (the portfolio-wide
  // aggregate) colored by needsRebalance (which gates on the per-class max), so an account could
  // show a large green number while actually being 3x its own tolerance. Now renders maxAbsDrift
  // paired with the account's own band.
  it('acc-011: drift figure pairs the max asset-class breach with the account\'s own band, in green when acceptable', async () => {
    const user = userEvent.setup()
    renderPage('hh-003')

    await screen.findByText('Williams Household')
    await user.click(screen.getByRole('tab', { name: /Portfolio/ }))

    await screen.findByText('David Williams Individual', { selector: 'p.text-body-strong' })
    const figure = screen.getByText('3.0% / ±5.0%')
    expect(figure.className).toMatch(/text-accent-green/)
  })
})
