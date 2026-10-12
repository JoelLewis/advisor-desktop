import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { generateTaxLotsWithSaleRisk } from '@/mocks/handlers/custodian'
import { lossAllowedNow } from '@/lib/tax-rules'
import { convertToBase } from '@/lib/currency'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { harvestClaim, runHarvestScanner, taxpayerHeldAway } from '../harvest-scanner'
import { canHoldSecurities } from '@/lib/held-away'

const ctx = (id: string) => ({ asOf: MOCK_NOW_ISO, subject: { type: 'account' as const, id } })
const figure = (findings: ReturnType<typeof runHarvestScanner>, label: string) => findings.flatMap((f) => f.figures).find((x) => x.label === label)

describe('Harvest Scanner over the whole book', () => {
  it.each(accounts.map((a) => a.id))('%s: digit-free claims, finite sourced figures, cited', (id) => {
    for (const f of runHarvestScanner(ctx(id))) {
      expect(f.claim).not.toMatch(/\d/)
      expect(f.claim.toLowerCase()).not.toContain('cleared')
      expect(f.claim.toLowerCase()).not.toContain('household')
      expect(f.citations.length).toBeGreaterThan(0)
      for (const fig of f.figures) {
        expect(Number.isFinite(fig.value)).toBe(true)
        expect(fig.source.length).toBeGreaterThan(0)
      }
    }
  })

  it('runs are deterministic', () => {
    expect(runHarvestScanner(ctx('acc-002'))).toEqual(runHarvestScanner(ctx('acc-002')))
  })

  it.each(accounts.map((a) => a.id))('%s: every loss it cites is the engine\'s allowed loss for that position, in USD', (id) => {
    const account = accounts.find((a) => a.id === id)!
    const lots = generateTaxLotsWithSaleRisk(account.id, account.totalValue)
    const positions = getPositionsForAccount(account.id, account.totalValue)
    for (const fig of runHarvestScanner(ctx(id)).flatMap((f) => f.figures).filter((x) => x.label.startsWith('Loss allowed now · '))) {
      const position = positions.find((p) => p.symbol === fig.label.slice('Loss allowed now · '.length))!
      const allowed = lots.filter((l) => l.positionId === position.id).reduce((s, l) => s + lossAllowedNow(l), 0)
      expect(fig.value).toBe(Math.round(convertToBase(allowed, account.baseCurrency ?? 'USD', FX_RATES_USD_BASE)))
      expect(fig.value).toBeLessThan(0)
    }
  })
})

describe('Harvest Scanner on acc-002', () => {
  const findings = runHarvestScanner(ctx('acc-002'))

  it('leads with the 7,000 INTC: the loss allowed now, nothing washed, and the window a sale today opens', () => {
    expect(findings[0]!.claim).toBe('Intel Corp. can be sold at a loss today, and nothing bought in the last thirty days would wash the loss.')
    expect(findings[0]!.attention).toBe('attention')
    expect(figure(findings, 'Loss allowed now · INTC')?.value).toBe(-45_850)
    expect(figure(findings, 'Washed · INTC')?.value).toBe(0)
    expect(figure(findings, 'Shares · INTC')?.value).toBe(7_000)
    expect(findings[0]!.citations.map((c) => c.source)).toContain('Wash-sale window · a sale of INTC on 2026-02-25 restricts buying it back through 2026-03-27')
  })

  it("states the taxpayer's open INTC restriction from rs-001", () => {
    const restriction = findings.find((f) => f.citations.some((c) => c.source.startsWith('Wash-sale window · rs-001')))!
    expect(restriction.claim).toBe('Intel Corp. was sold at a loss recently; buying it back in any account of the same taxpayer, IRAs and Roths included, would wash that loss until its window closes.')
    expect(figure([restriction], 'Days until the INTC window closes')?.value).toBe(25)
    expect(figure([restriction], 'Loss realised · INTC')?.value).toBe(-32_750)
    expect(restriction.citations[0]!.source).toBe('Wash-sale window · rs-001 · INTC loss sale of 2026-02-20, open through 2026-03-22')
  })

  it('flags the held-away accounts as not visible to wash-sale checks', () => {
    const away = findings.find((f) => f.claim.startsWith('Held-away accounts'))!
    expect(away.claim).toBe('Held-away accounts are not visible to wash-sale checks; a purchase in one can still wash a loss.')
    expect(away.figures.map((f) => [f.label, f.value])).toEqual([['Held away · Vanguard 401(k)', 2_400_000], ['Held away · TIAA 403(b)', 1_500_000]])
  })
})

describe('Harvest Scanner wording', () => {
  it('a tax-advantaged account has no loss to harvest, but its purchases are still restricted', () => {
    const ira = runHarvestScanner(ctx('acc-003'))
    expect(ira[0]!.claim).toBe('Sales in this account are not taxed, so there is no loss to harvest here.')
    expect(ira.some((f) => f.claim.startsWith('Intel Corp. was sold at a loss recently'))).toBe(true)
  })
  it('an irrevocable trust is its own taxpayer: no one else\'s held-away accounts', () => {
    expect(taxpayerHeldAway(accounts.find((a) => a.id === 'acc-006')!)).toEqual([])
  })
  it('a coin held directly is outside the wash-sale rule', () => {
    expect(harvestClaim('Ether', 'ETH', { allowed: -100, deferred: 0, disallowed: 0 })).toBe('Ether can be sold at a loss today; as a coin held directly it is outside the wash-sale rule.')
  })
  it('an IRA or Roth replacement makes part of the loss permanently disallowed; a taxable one defers it', () => {
    expect(harvestClaim('Intel Corp.', 'INTC', { allowed: -100, deferred: -10, disallowed: -20 })).toBe(
      'Intel Corp. can be sold at a loss today; part of the loss would be deferred into the replacement shares, and part would be permanently disallowed because the replacement was bought in an IRA or Roth.')
  })
})

describe('held-away holdings that can wash a loss', () => {
  const heldAwayLabels = (id: string) => runHarvestScanner(ctx(id))
    .filter((f) => f.claim.startsWith('Held-away accounts'))
    .flatMap((f) => f.figures.map((x) => x.label))
  const holding = (id: string) => heldAwayAssets.find((h) => h.id === id)!

  it('property and private company stock cannot be substantially identical to a listed security', () => {
    expect(holding('ha-003').isPrivateCompanyStock).toBe(true)
    expect(['ha-003', 'ha-004', 'ha-006'].map((id) => canHoldSecurities(holding(id)))).toEqual([false, false, false])
    expect(['ha-001', 'ha-002', 'ha-009', 'ha-010'].map((id) => canHoldSecurities(holding(id)))).toEqual([true, true, true, true])
  })
  it.each(['acc-007', 'acc-015'])('%s: no real-estate or private-stock holding is listed', (id) => {
    for (const label of heldAwayLabels(id)) {
      expect(label).not.toContain('Real Estate Holdings')
      expect(label).not.toContain('Company Stock (Private)')
    }
  })
  it('acc-002 still lists its 401(k) and 403(b)', () => {
    expect(heldAwayLabels('acc-002')).toEqual(['Held away · Vanguard 401(k)', 'Held away · TIAA 403(b)'])
  })
})

