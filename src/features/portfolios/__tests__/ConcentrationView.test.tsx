import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { accounts } from '@/mocks/data/accounts'
import { allPositions, getPositionsForAccount } from '@/mocks/data/positions'
import { isMaterialWeight } from '@/lib/security-master'
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

  // Task 10 review — the 2% table's threshold now sits on a derived weight. `> 0.02` was stable
  // against the old hand-typed literals and is not stable against `marketValue / totalValue`.
  describe('the 2% materiality bar', () => {
    it('excludes a holding at exactly 2%, however the division lands', () => {
      expect(isMaterialWeight(0.02)).toBe(false)
      // The float shapes `(totalValue * 0.02) / totalValue` actually produces.
      expect(isMaterialWeight((102_462 * 0.02) / 102_462)).toBe(false)
      expect(isMaterialWeight(0.020000000000000004)).toBe(false)
      // ...and still admits anything genuinely above it, including one basis point above.
      expect(isMaterialWeight(0.0201)).toBe(true)
      expect(isMaterialWeight(0.278)).toBe(true)
    })

    it('keeps all thirty generated CASH lines out of the table', () => {
      const explicit = new Set(allPositions.map((p) => p.accountId))
      const generated = accounts.filter((a) => !explicit.has(a.id))
      expect(generated.length, 'vacuity guard: no generated accounts').toBeGreaterThan(25)
      const cashLines = generated.flatMap((a) =>
        getPositionsForAccount(a.id, a.totalValue).filter((p) => p.assetClass === 'cash'),
      )
      expect(cashLines.length, 'vacuity guard: no generated cash lines').toBe(30)
      expect(cashLines.filter((p) => isMaterialWeight(p.weight)).map((p) => p.accountId)).toEqual([])
    })

    it('never hides a breach: every breach in the book clears the bar', () => {
      let checked = 0
      const hidden: string[] = []
      for (const account of accounts) {
        for (const p of getPositionsForAccount(account.id, account.totalValue)) {
          checked++
          // The smallest limit any kind carries is the 10% single-issuer one, so a breach cannot
          // sit under a 2% bar. Asserted rather than assumed.
          if (p.weight > 0.10 && !isMaterialWeight(p.weight)) hidden.push(`${account.id} ${p.symbol}`)
        }
      }
      expect(checked, 'vacuity guard').toBeGreaterThan(300)
      expect(hidden).toEqual([])
    })
  })

  it('does not misreport the pooled-vehicle funds as breached (acc-042)', async () => {
    renderWithProviders(<ConcentrationView accountId="acc-042" />)
    await screen.findByText(/single-issuer limit/)

    // ES3.SI, CLR.SI, MBH.SI, A17U.SI are all funds under their own 35% limit — none breach.
    expect(screen.queryByText(/ES3\.SI at/)).not.toBeInTheDocument()
    expect(screen.queryByText(/CLR\.SI at/)).not.toBeInTheDocument()
  })
})
