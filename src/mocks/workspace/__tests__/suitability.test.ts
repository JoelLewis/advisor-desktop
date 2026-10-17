import { describe, it, expect, beforeEach } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { riskProfileFor } from '@/mocks/handlers/pms'
import { riskScoreOf } from '@/mocks/reference/risk-score'
import { bookRiskView, householdRiskOf } from '@/mocks/reference/risk'
import { isModelManaged } from '@/lib/mandate'
import { GLIDE_PATH_MODELS } from '@/mocks/data/model-governance'
import { modelAboveTolerance, needsSuitabilityReason, toleranceLine, withSuitability } from '../suitability'
import { AGENT_CONSTRAINTS, versionOf } from './proposal-fixture'

const account = (id: string) => {
  const a = accounts.find((x) => x.id === id)
  if (!a) throw new Error(`no ${id}`)
  return a
}

describe("the household's risk against the client's tolerance", () => {
  it("Robert Johnson's household is the value-weighted score of his accounts' real holdings, and it sits within his Moderate band", () => {
    const robert = ['acc-001', 'acc-002', 'acc-003'].map((id) => riskProfileFor(account(id)))
    const weighted = robert.reduce((s, p) => s + riskScoreOf(p.vol) * p.value, 0) / robert.reduce((s, p) => s + p.value, 0)
    const household = householdRiskOf('cli-001')
    expect(household?.posture.score).toBe(Math.round(weighted))
    expect(household).toMatchObject({ clientName: 'Robert Johnson', householdName: 'Johnson Household', accountIds: ['acc-001', 'acc-002', 'acc-003'] })
    expect(household?.posture).toMatchObject({ status: 'within', tolerance: { band: 'Moderate', floor: 41, ceiling: 55 } })
  })

  it("a spouse's accounts are measured against the spouse's own questionnaire, not the household's other client", () => {
    expect(householdRiskOf('cli-001')?.accountIds).not.toContain('acc-004')
    expect(householdRiskOf('cli-002')).toMatchObject({ accountIds: ['acc-004', 'acc-005'], posture: { status: 'within', tolerance: { band: 'Moderate Conservative' } } })
  })

  it('a glide path is left out of the household, as it is left out of the tolerance', () => {
    expect(householdRiskOf('cli-011')?.accountIds).not.toContain('acc-029')
  })

  it("Robert's IRA below his band reads asset location on Book risk, because his household is within it; it raises no suitability flag", () => {
    const book = bookRiskView('user-001')
    if (!book) throw new Error('no book')
    const ira = book.rows.find((r) => r.accountId === 'acc-003')
    expect(ira?.posture.status).toBe('below')
    expect(ira?.assetLocation).toBe(true)
    expect(modelAboveTolerance(account('acc-003'))).toBeUndefined()
    expect(book.households.find((h) => h.clientId === 'cli-001')?.posture.status).toBe('within')
  })

  it('an account outside its band is never asset location when its household is outside too', () => {
    const book = bookRiskView('user-001')
    if (!book) throw new Error('no book')
    const outside = new Set(book.households.filter((h) => h.posture.status !== 'within').map((h) => h.clientId))
    expect(outside.size).toBeGreaterThan(0)
    for (const r of book.rows) {
      const flagged = r.posture.status === 'above' || r.posture.status === 'below'
      expect(r.assetLocation, r.accountId).toBe(flagged && !outside.has(r.posture.tolerance.clientId))
    }
  })
})

describe('model above tolerance', () => {
  beforeEach(() => resetWorkspaceStore())

  it("Growth sits above Robert Johnson's Moderate tolerance for this account; his household is within it", () => {
    const gap = modelAboveTolerance(account('acc-002'))
    expect(gap).toMatchObject({ modelName: 'Growth', clientName: 'Robert Johnson', household: { score: householdRiskOf('cli-001')?.posture.score, status: 'within' } })
    expect(gap?.modelBand.label).toBe('Moderate Aggressive')
    expect(gap?.tolerance.label).toBe('Moderate')
    if (!gap) throw new Error('no gap')
    expect(toleranceLine(gap.modelName, gap.clientName, gap.tolerance.label, gap.household.status)).toBe(
      "Growth sits above Robert Johnson's Moderate tolerance for this account; the household as a whole is within it",
    )
  })

  it('a household outside the band too reads as the stronger warning', () => {
    const gap = modelAboveTolerance(account('acc-017'))
    expect(gap).toMatchObject({ clientName: 'Jennifer Martinez', household: { status: 'above' } })
    expect(toleranceLine('Growth', 'Jennifer Martinez', 'Moderate', 'above')).toBe(
      "Growth sits above Jennifer Martinez's Moderate tolerance for this account, and the household as a whole is above it too",
    )
  })

  it('every Johnson version carries it as a warning on no leg, with the household, and nothing blocks because of it', () => {
    const v1 = versionOf(1, AGENT_CONSTRAINTS)
    const check = v1.pretrade.violations.find((v) => v.category === 'model_above_tolerance')
    expect(check).toMatchObject({
      severity: 'warning', legs: [],
      tolerance: { modelName: 'Growth', clientName: 'Robert Johnson', toleranceBand: 'Moderate', householdStatus: 'within', householdScore: householdRiskOf('cli-001')?.posture.score },
    })
    expect(check?.message).toMatch(/^Growth sits above Robert Johnson's Moderate tolerance for this account; the household as a whole is within it\./)
    expect(needsSuitabilityReason(v1.pretrade)).toBe(true)
    const others = v1.pretrade.violations.filter((v) => v.category !== 'model_above_tolerance')
    expect(v1.pretrade.passed).toBe(others.every((v) => v.severity !== 'block'))
  })

  it('a model within the tolerance adds nothing', () => {
    const within = accounts.filter(isModelManaged).find((a) => !GLIDE_PATH_MODELS.has(a.modelId) && modelAboveTolerance(a) === undefined)
    if (!within) throw new Error('the book has no account inside its tolerance')
    const empty = { accountId: within.id, passed: true, violations: [], legs: [], projectedCash: 0, projectedCashPct: 0, minimumCash: 0 }
    expect(withSuitability(empty, within)).toEqual(empty)
  })

  it('a glide path and a custom mandate are never measured against the tolerance', () => {
    for (const a of accounts.filter((x) => !isModelManaged(x) || GLIDE_PATH_MODELS.has(x.modelId))) expect(modelAboveTolerance(a), a.id).toBeUndefined()
  })
})
