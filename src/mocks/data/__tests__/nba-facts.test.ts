import { describe, it, expect } from 'vitest'
import { nbas } from '@/mocks/data/nbas'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { householdFees } from '@/mocks/data/billing'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { estimatedTaxBenefit } from '@/features/portfolios/tax/shared'

function positionsFor(accountId: string) {
  const account = accounts.find((a) => a.id === accountId)!
  return getPositionsForAccount(account.id, account.totalValue)
}

describe('NBA narratives match the data', () => {
  // PRE-FLIGHT correction 1/2: the brief's original D9 test built { nbaId, accountId, symbol }
  // triples and asserted only "does this account hold this hardcoded symbol" — `claim.nbaId` was
  // used solely as an error-message label, and the symbol was never derived from the NBA's own
  // `description`. A narrative that drifted to name a different security would go unnoticed. Each
  // case below extracts its symbol from the NBA's actual text via a pattern anchored to how that
  // NBA phrases the claim, so the assertion is genuinely about the narrative. The ids are also
  // corrected: the NVDA/acc-011/David Williams concentration NBA is nba-007 (post Step-4 rewrite),
  // not nba-006 (which is Linda Garcia's unrelated retirement review).
  it('D9: a security a routing NBA names by ticker exists in the account it targets', () => {
    const cases: { nbaId: string; accountId: string; extract: RegExp }[] = [
      { nbaId: 'nba-002', accountId: 'acc-002', extract: /\(([A-Z]{2,5})\)/ }, // "Intel (INTC)"
      { nbaId: 'nba-007', accountId: 'acc-011', extract: /holds ([A-Z]{2,5}) at/ }, // NVDA concentration
    ]
    for (const { nbaId, accountId, extract } of cases) {
      const nba = nbas.find((n) => n.id === nbaId)!
      const symbol = nba.description.match(extract)?.[1]
      expect(symbol, `${nbaId} should name a ticker matching ${extract}`).toBeTruthy()
      const symbols = positionsFor(accountId).map((p) => p.symbol)
      expect(symbols, `${nbaId} names ${symbol}, which acc-should hold`).toContain(symbol)
    }
  })

  it('D9: the wash-sale NBA names a security the account must NOT currently hold', () => {
    // nba-003 is Margaret Chen's wash-sale NBA: "sold NVDA … do not repurchase until the window
    // expires". By construction acc-007 should NOT hold NVDA (it has no explicit fixture
    // positions; the generated fallback is VTI/EFA/QQQ/AGG/BND/GLD/CASH). Asserting the account
    // holds the sold security would contradict the narrative the test exists to protect.
    const nba = nbas.find((n) => n.id === 'nba-003')!
    const symbol = nba.description.match(/sold ([A-Z]{2,5})/)?.[1]
    expect(symbol).toBe('NVDA')
    const symbols = positionsFor('acc-007').map((p) => p.symbol)
    expect(symbols).not.toContain(symbol)
  })

  it('D9: no NBA mentions AAPL founder shares', () => {
    for (const nba of nbas) {
      expect(nba.description.toLowerCase()).not.toContain('founder shares')
    }
  })

  it('D10: Michael Martinez turns 58 on the anniversary of 1968-12-07', () => {
    const dob = households.flatMap((h) => h.members).find((m) => m.name === 'Michael Martinez')!.dateOfBirth
    expect(dob).toBe('1968-12-07')
    const nba = nbas.find((n) => n.description.includes('Michael Martinez') && /turns \d+/.test(n.description))
    if (nba) expect(nba.description).toContain('7 December')
  })

  // PRE-FLIGHT correction 3: `nbas.find(n => n.description.includes('529'))` returns nba-005
  // (Patel, "probability dropped from 88% to 74%"), which appears before nba-020 (O'Brien) in
  // array order and contains neither '80%' nor '55%'. The first assertion below would pass on
  // nba-005 by accident and the second would fail forever, even after Step 4 correctly rewrites
  // nba-020 — the predicate never reaches it. Key on the id directly.
  it("D11: the O'Brien 529 drift claim uses mod-006's 55% equity target", () => {
    const nba = nbas.find((n) => n.id === 'nba-020')!
    expect(nba.description).not.toContain('80%')
    expect(nba.description).toContain('55%')
  })

  it('D12: no NBA recommends rotating out of a security the household does not hold', () => {
    // The original defect (a TLT rotation recommended for a portfolio holding no TLT) lived in
    // `suggestedAction` ("rotating from TLT to BND/SCHZ"), not `description` — scanning only
    // `description`, as the brief's original test did, would pass on the unfixed text, since the
    // ticker it should have caught was never in the field it looked at. Scan both.
    const anderson = ['acc-022', 'acc-023', 'acc-024', 'acc-025'].flatMap((id) => positionsFor(id).map((p) => p.symbol))
    const nba = nbas.find((n) => n.description.includes('Anderson') && n.description.includes('duration'))
    if (nba) {
      const text = nba.description + ' ' + nba.suggestedAction
      const named = [...text.matchAll(/\b([A-Z]{2,5})\b/g)].map((m) => m[1]!)
        .filter((s) => !['IRA', 'ETF', 'SEC', 'RMD', 'AUM', 'IPS'].includes(s))
      for (const symbol of named) expect(anderson).toContain(symbol)
    }
  })
})

describe('D22: nba-002 states the post-Task-18 harvestable loss, not the stale pre-Task-18 figure', () => {
  // Task 18 shrank acc-002's INTC from 12,000 to 7,000 shares, which changed the
  // $78.6K + $52.4K + $93.3K = $224K sum this NBA's description used to cite. The correct total is
  // derived here from the live INTC lots across the three accounts, rather than transcribed,
  // so this test breaks the moment nbas.ts drifts from the fixtures again — in either direction.
  const nba = nbas.find((n) => n.id === 'nba-002')!
  const intcLosses = ['acc-002', 'acc-011', 'acc-015'].map((id) => {
    const intc = positionsFor(id).find((p) => p.symbol === 'INTC')!
    return intc.gainLoss
  })
  const total = intcLosses.reduce((sum, g) => sum + g, 0)

  it('the three INTC lots total exactly -191,500, not the stale -224,000', () => {
    expect(total).toBe(-191_500)
  })

  it("the description states each account's exact loss and the exact total", () => {
    for (const loss of intcLosses) {
      expect(nba.description).toContain(`$${Math.abs(loss).toLocaleString('en-US')}`)
    }
    expect(nba.description).toContain(`$${Math.abs(total).toLocaleString('en-US')}`)
    expect(nba.description).not.toContain('224')
    expect(nba.description).not.toContain('78.6')
  })

  it('the appended benefit figure is the loss, at long-term rates, not the loss itself', () => {
    const benefit = intcLosses.reduce((sum, g) => sum + estimatedTaxBenefit({ gainLoss: g, holdingPeriod: 'long' }), 0)
    expect(benefit).toBeCloseTo(45_577, 0)
    expect(nba.description).toContain('$45,600')
    expect(nba.description).toContain('not the benefit')
  })
})

describe('Terminology: firm policy vs regulatory citation', () => {
  it('nba-003 states the IPS single-issuer cap, not a fabricated security-level model target', () => {
    const nba = nbas.find((n) => n.id === 'nba-003')!
    expect(nba.description).not.toContain('5% NVDA weight')
    expect(nba.description).toContain('IPS caps any single issuer at 10%')
  })

  it('nba-012 attributes the annual IPS review cadence to firm policy, not the SEC', () => {
    const nba = nbas.find((n) => n.id === 'nba-012')!
    expect(nba.description).not.toContain('SEC best practice')
    expect(nba.description).toContain('Firm policy requires an annual IPS review')
  })

  it('nba-013 attributes the $100K documentation threshold to firm policy and names the real rule', () => {
    const nba = nbas.find((n) => n.id === 'nba-013')!
    expect(nba.description).not.toContain('Compliance requires source-of-funds documentation for transactions over $100K')
    expect(nba.description).toContain('Firm policy requires source-of-funds documentation above $100,000')
    expect(nba.description).toContain('FinCEN')
  })
})

describe('Reg BI / DOL PTE 2020-02 rollover framing', () => {
  const rollover = nbas.find((n) => n.id === 'nba-014')!

  it('does not claim a rollover saves money when it adds cost', () => {
    expect(rollover.description).not.toMatch(/save[sd]?\s*~?\$?4,?800/i)
    expect(rollover.description.toLowerCase()).not.toContain('could save')
  })

  it("quotes the household's actual advisory rate", () => {
    const williams = householdFees.find((f) => f.householdId === 'hh-003')!
    expect(williams.annualRate).toBe(0.0085)
    expect(rollover.description).toContain('0.85%')
  })

  it('shows both sides of the cost comparison and the added annual cost', () => {
    expect(rollover.description).toContain('0.45%')
    expect(rollover.description).toContain('$10,200')
    expect(rollover.description).toContain('$5,400')
    expect(rollover.description).toContain('$4,800')
  })

  it('names the disclosure obligation', () => {
    expect(rollover.description + rollover.suggestedAction).toContain('PTE 2020-02')
  })

  it('estimatedImpact is not the fee increase presented as a benefit', () => {
    expect(rollover.estimatedImpact).not.toBe(4_800)
  })
})
