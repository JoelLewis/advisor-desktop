import { describe, it, expect } from 'vitest'
import { compositeScore, harvestImpactScore, harvestPriority, intcHarvestFacts, nbas } from '@/mocks/data/nbas'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { annualFeeOn, billingView } from '@/mocks/reference/billing'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { lossAllowedNow, washesOnSale } from '@/lib/tax-rules'
import { estimateTaxOnReturns } from '@/mocks/handlers/tax-return'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { generateTaxLotsWithSaleRisk } from '@/mocks/handlers/custodian'

// These tests pin NBA narratives to the mock data. The action-route guard lives in nba-routes.test.ts.

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

  it("D9: nba-007's 13.9% concentration figure matches pos-070's actual weight, not a stale carryover", () => {
    // Review round 1, Minor · the "13.9%" text and the NVDA position's real `weight` were never
    // tied together — mutating the narrative to a different percentage would have passed.
    const nba = nbas.find((n) => n.id === 'nba-007')!
    const nvda = positionsFor('acc-011').find((p) => p.symbol === 'NVDA')!
    expect(nvda.weight).toBeCloseTo(0.139, 3)
    expect(nba.description).toContain(`${(nvda.weight * 100).toFixed(1)}%`)
  })

  it("D9: nba-007's estimatedImpact is the dollar excess over the 10% IPS limit, not a stale carryover", () => {
    // Review round 1, Minor · estimatedImpact: 310_000 was the deleted Margaret Chen/AAPL
    // narrative's figure (a $6.8M account) and survived onto a different client, account and
    // security untouched. The dollar amount that actually needs trimming is the position's
    // marketValue less 10% of the account's totalValue.
    const nba = nbas.find((n) => n.id === 'nba-007')!
    const account = accounts.find((a) => a.id === 'acc-011')!
    const nvda = positionsFor('acc-011').find((p) => p.symbol === 'NVDA')!
    const excessOverLimit = nvda.marketValue - 0.1 * account.totalValue
    expect(excessOverLimit).toBe(110_000)
    expect(nba.estimatedImpact).toBe(excessOverLimit)
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
    // Review round 1, Important #5 · the `if (nba)` guard made this vacuous: dropping "Michael
    // Martinez" or "turns \d+" from the description would silently no-op the assertion rather
    // than fail. Key on the id directly, as D11 already does, with no conditional.
    const dob = households.flatMap((h) => h.members).find((m) => m.name === 'Michael Martinez')!.dateOfBirth
    expect(dob).toBe('1968-12-07')
    const nba = nbas.find((n) => n.id === 'nba-009')!
    expect(nba.description).toContain('7 December')
    // aiMessage feeds the AI drafting flow directly (NBAFeed.tsx) — it must not still say the
    // wrong date even though description was fixed.
    expect(nba.actionRoute?.aiMessage).toContain('7 December')
    expect(nba.actionRoute?.aiMessage).not.toContain('March 1')
  })

  // PRE-FLIGHT correction 3: `nbas.find(n => n.description.includes('529'))` returns nba-005
  // (Patel, "probability dropped from 88% to 74%"), which appears before nba-020 (O'Brien) in
  // array order and contains neither '80%' nor '55%'. The first assertion below would pass on
  // nba-005 by accident and the second would fail forever, even after Step 4 correctly rewrites
  // nba-020 — the predicate never reaches it. Key on the id directly.
  //
  // Review round 1, Important #1 · the first pass replaced one unfixture-backed figure (80%) with
  // another (62%) — acc-032 has no explicit positions, so its equity weight comes from
  // `getPositionsForAccount`'s generated fallback, whose weights (VTI 0.348, QQQ 0.087,
  // EFA 0.145 — fixed constants, independent of totalValue) sum to exactly 58.0% equity, not 62%.
  // Both ends of the claim are now derived: the model target from the live `/pms/models` payload
  // (mod-006), the actual from the account's live positions.
  it('D12: no NBA recommends rotating out of a security the household does not hold', () => {
    // The original defect (a TLT rotation recommended for a portfolio holding no TLT) lived in
    // `suggestedAction` ("rotating from TLT to BND/SCHZ"), not `description` — scanning only
    // `description`, as the brief's original test did, would pass on the unfixed text, since the
    // ticker it should have caught was never in the field it looked at. Scan both.
    //
    // Review round 1, Important #5 · this also had the `if (nba)` vacuous-pass guard: dropping
    // "duration" from nba-008's description would silently no-op the whole check, even with the
    // TLT text restored. Key on the id directly.
    const anderson = ['acc-022', 'acc-023', 'acc-024', 'acc-025'].flatMap((id) => positionsFor(id).map((p) => p.symbol))
    const nba = nbas.find((n) => n.id === 'nba-008')!
    const text = nba.description + ' ' + nba.suggestedAction
    const named = [...text.matchAll(/\b([A-Z]{2,5})\b/g)].map((m) => m[1]!)
      .filter((s) => !['IRA', 'ETF', 'SEC', 'RMD', 'AUM', 'IPS'].includes(s))
    for (const symbol of named) expect(anderson).toContain(symbol)
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

  const intcAccounts = ['acc-002', 'acc-011', 'acc-015'].map((id) => accounts.find((a) => a.id === id)!)
  const intcLotsOf = (account: (typeof accounts)[number]) => {
    const intc = positionsFor(account.id).find((p) => p.symbol === 'INTC')!
    return generateTaxLotsWithSaleRisk(account.id, account.totalValue).filter((l) => l.positionId === intc.id)
  }
  const intcLots = intcAccounts.flatMap(intcLotsOf)

  it('no INTC lot washes on sale today, so a harvest realizes every lot\'s whole loss', () => {
    expect(intcLots.some(washesOnSale)).toBe(false)
  })

  // §0.7 fix round 1 · the benefit was each lot's loss at its own holding-period rate ($61,400), as
  // if every client had gains of that character to offset. They do not: the tax a harvest saves
  // this year is what it takes off each client's own return (`estimateTaxOnReturns`, netted against
  // `ytdRealizedOnReturn`). At 2026-02-25: acc-002's joint return is already −32,750 LT (rs-001)
  // and acc-015's −24,867 ST (rs-003), so harvesting saves them nothing this year; acc-011's
  // return has +6,260 LT (rs-004), so it saves 6,260 × 0.238 = 1,489.88, rounded 1,490.
  const savingThisYear = intcAccounts.map((account) => {
    const lots = intcLotsOf(account)
    const allowed = (period: 'short' | 'long') => lots.filter((l) => l.holdingPeriod === period).reduce((s, l) => s + lossAllowedNow(l), 0)
    const estimate = estimateTaxOnReturns([{ account, legs: [{ realizedShortTerm: allowed('short'), realizedLongTerm: allowed('long'), taxImpact: 0 }] }], MOCK_TODAY_ISO)[0]!
    return 0 - estimate.net
  })

  it("each client's saving this year is what the harvest takes off their own return", () => {
    expect(savingThisYear).toEqual([0, 1_490, 0])
  })

  it('estimatedImpact is the sum of those return-level savings, not a lot-rate benefit or the raw loss', () => {
    // Review round 1, Critical · this was once 224_000, the raw loss; then 61,430, each lot at its
    // own rate. Both price a loss against gains these clients have not realized.
    expect(nba.estimatedImpact).toBe(savingThisYear.reduce((s, x) => s + x, 0))
    expect(nba.estimatedImpact).not.toBe(Math.abs(total))
    expect(nba.estimatedImpact).not.toBe(224_000)
  })

  it('states no pooled lot-rate benefit', () => {
    expect(nba.description).not.toContain('61,4')
    expect(nba.description).not.toContain("each lot's own rate")
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
    expect(nba.description).not.toContain('2024-09-10')
  })

  it('nba-013 attributes the $100K documentation threshold to firm policy and names the real rule', () => {
    const nba = nbas.find((n) => n.id === 'nba-013')!
    expect(nba.description).not.toContain('Compliance requires source-of-funds documentation for transactions over $100K')
    expect(nba.description).toContain('Firm policy requires source-of-funds documentation above $100,000')
    expect(nba.description).toContain('FinCEN')
  })
})

describe('rollover framing: Advisers Act fiduciary duty; DOL PTE 2020-02 for an ERISA plan', () => {
  const rollover = nbas.find((n) => n.id === 'nba-014')!

  it('does not claim a rollover saves money when it adds cost', () => {
    expect(rollover.description).not.toMatch(/save[sd]?\s*~?\$?4,?800/i)
    expect(rollover.description.toLowerCase()).not.toContain('could save')
  })

  it("quotes the household's marginal cost on the firm's schedule", () => {
    const williams = billingView('user-001')?.households.find((h) => h.householdId === 'hh-003')
    if (!williams) throw new Error('Williams is billed')
    const added = annualFeeOn(williams.value + 1_200_000) - annualFeeOn(williams.value)
    expect(Math.round(added / 100) * 100).toBe(8_400)
    expect(rollover.description).toContain('0.70%')
  })

  it('shows both sides of the cost comparison and the added annual cost', () => {
    expect(rollover.description).toContain('0.45%')
    expect(rollover.description).toContain('$8,400')
    expect(rollover.description).toContain('$5,400')
    expect(rollover.description).toContain('$3,000')
  })

  // Review round 1, Important #2 (the twelfth cannot-fail test) · every assertion above pins
  // numbers and one forbidden phrase, but none of them pin the *direction*. Swapping "raise" for
  // "reduce" — or fully re-inverting (swapping both rate/dollar pairs between "our schedule" and
  // "the plan" AND flipping the verb) — leaves every string above untouched and passes. The
  // original defect was a sign inversion; a test that can't fail on a sign inversion doesn't test
  // this finding. Pin which number belongs to which party, and pin the verb.
  it('attributes the higher rate/cost to our schedule and the lower one to the plan, and states the direction as an increase', () => {
    // Windows, not `[^;.]*[;.]` sentence-matching: the numbers themselves ("0.85%") contain
    // periods, so a terminator-based regex truncates at the decimal point and never actually
    // sees the dollar figure it's supposed to be checking.
    const WINDOW = 70
    const scheduleIdx = rollover.description.toLowerCase().indexOf('our schedule')
    const planIdx = rollover.description.toLowerCase().indexOf('plan cost')
    expect(scheduleIdx, 'should name "our schedule"').toBeGreaterThan(-1)
    expect(planIdx, 'should name "plan cost"').toBeGreaterThan(-1)

    const scheduleWindow = rollover.description.slice(scheduleIdx, scheduleIdx + 140)
    expect(scheduleWindow).toContain('0.70%')
    expect(scheduleWindow).toContain('$8,400')

    const planWindow = rollover.description.slice(planIdx, planIdx + WINDOW)
    expect(planWindow).toContain('0.45%')
    expect(planWindow).toContain('$5,400')

    // The delta sentence must say the rollover costs more, not less — this is the actual finding.
    expect(rollover.description).toMatch(/rais(e|es|ing)|increase|adds/i)
    expect(rollover.description).not.toMatch(/reduc(e|es|ing)|lower(s|ing)?|decrease|save/i)
  })

  it('names the disclosure obligation', () => {
    expect(rollover.description + rollover.suggestedAction).toContain('PTE 2020-02')
  })

  it('estimatedImpact is not the fee increase (or any other revenue figure) presented as a benefit', () => {
    // Review round 1, Minor · `not.toBe(4_800)` alone let `10_200` (the other, larger fee figure)
    // through, which is an arguably worse framing than the original defect. Pin the actual value
    // and the presence of the note that explains it, rather than only excluding one bad answer.
    expect(rollover.estimatedImpact).toBe(0)
    expect(rollover.estimatedImpact).not.toBe(4_800)
    expect(rollover.estimatedImpact).not.toBe(10_200)
    expect(rollover.estimatedImpact).not.toBe(5_400)
    expect(rollover.estimatedImpactNote).toBeTruthy()
    expect(rollover.estimatedImpactNote?.toLowerCase()).toContain('not scored on revenue')
  })
})

describe('nba-002 is scored from the engine', () => {
  const nba = nbas.find((n) => n.id === 'nba-002')!
  const saving = intcHarvestFacts().totalSavingThisYear

  it('impact comes from this year\'s saving; priority and composite follow from it', () => {
    expect(saving).toBe(1_490)
    expect(harvestImpactScore(saving)).toBe(39)
    expect(nba.scoring.impact).toBe(harvestImpactScore(saving))
    expect(nba.priority).toBe(harvestPriority(nba.scoring.impact))
    expect(nba.priority).toBe('medium')
    const { composite, ...rest } = nba.scoring
    expect(composite).toBe(compositeScore(rest))
    expect(nba.estimatedImpact).toBe(saving)
    expect(nba.estimatedImpactNote).toContain('carries forward')
  })

  it('the impact scale is monotonic and bounded', () => {
    expect(harvestImpactScore(0)).toBe(0)
    expect(harvestImpactScore(100)).toBe(0)
    expect(harvestImpactScore(10_000)).toBe(67)
    expect(harvestImpactScore(100_000)).toBe(100)
    expect(harvestImpactScore(10_000_000)).toBe(100)
    expect(harvestPriority(69)).toBe('medium')
    expect(harvestPriority(70)).toBe('high')
  })
})
