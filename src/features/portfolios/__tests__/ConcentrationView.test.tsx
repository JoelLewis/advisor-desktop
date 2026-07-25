import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { ConcentrationView } from '../ConcentrationView'

describe('ConcentrationView', () => {
  // C23 fix round 1 — Important 3: acc-042 has a genuine mixed-kind breach set (two single-issuer
  // breaches at the 10% limit, plus cash at the 15% limit). The banner used to build its sentence
  // from the *first* breached position's limit/kind and apply it to every symbol named, so the
  // cash breach would have been misreported as a 10% single-issuer breach. This end-to-end render
  // confirms the real handler output produces the correctly attributed sentence.
  it('states the correct limit for each kind in a mixed breach set (acc-042)', async () => {
    renderWithProviders(<ConcentrationView accountId="acc-042" />)

    await screen.findByText(/single-issuer limit/)

    expect(screen.getByText(/D05\.SI at 17\.1% and O39\.SI at 13\.3% exceed the 10% single-issuer limit\./)).toBeInTheDocument()
    expect(screen.getByText(/CASH at 20\.7% exceeds the 15% cash limit\./)).toBeInTheDocument()
    // The old bug: the cash breach would have been folded into the 10% single-issuer sentence.
    expect(screen.queryByText(/CASH at 20\.7% exceeds the 10%/)).not.toBeInTheDocument()
  })

  it('does not misreport the pooled-vehicle funds as breached (acc-042)', async () => {
    renderWithProviders(<ConcentrationView accountId="acc-042" />)
    await screen.findByText(/single-issuer limit/)

    // ES3.SI, CLR.SI, MBH.SI, A17U.SI are all funds under their own 35% limit — none breach.
    expect(screen.queryByText(/ES3\.SI at/)).not.toBeInTheDocument()
    expect(screen.queryByText(/CLR\.SI at/)).not.toBeInTheDocument()
  })
})
