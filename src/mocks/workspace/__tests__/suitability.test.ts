import { describe, it, expect, beforeEach } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { riskProfileFor } from '@/mocks/handlers/pms'
import { riskScoreOf } from '@/mocks/reference/risk-score'
import { bookRiskView, clientRiskOf, modelScoreOf } from '@/mocks/reference/risk'
import { bandFor } from '@/lib/risk-profile'
import { isModelManaged } from '@/lib/mandate'
import { GLIDE_PATH_MODELS } from '@/mocks/data/model-governance'
import { modelAboveTolerance, needsSuitabilityReason, toleranceLine, withSuitability } from '../suitability'
import { AGENT_CONSTRAINTS, versionOf } from './proposal-fixture'

const account = (id: string) => {
  const a = accounts.find((x) => x.id === id)
  if (!a) throw new Error(`no ${id}`)
  return a
}
const book = () => {
  const v = bookRiskView('user-001')
  if (!v) throw new Error('no book')
  return v
}
const rebalance = (id: string) => modelAboveTolerance(account(id), generateRebalanceTrades(id, true))

describe("a client's accounts as a whole against the client's own tolerance", () => {
  it("Robert Johnson's accounts as a whole score 51 today: the value-weighted average of his accounts' holdings scores, within his Moderate band", () => {
    const robert = ['acc-001', 'acc-002', 'acc-003'].map((id) => riskProfileFor(account(id)))
    const weighted = robert.reduce((s, p) => s + riskScoreOf(p.vol) * p.value, 0) / robert.reduce((s, p) => s + p.value, 0)
    const whole = clientRiskOf('cli-001')
    expect(whole?.posture.score).toBe(51)
    expect(Math.round(weighted)).toBe(51)
    expect(whole).toMatchObject({ clientName: 'Robert Johnson', accountIds: ['acc-001', 'acc-002', 'acc-003'] })
    expect(whole?.posture).toMatchObject({ status: 'within', tolerance: { band: 'Moderate', floor: 41, ceiling: 55 } })
  })

  it("a spouse's accounts are her own whole, against her own questionnaire", () => {
    expect(clientRiskOf('cli-001')?.accountIds).not.toContain('acc-004')
    expect(clientRiskOf('cli-002')).toMatchObject({ accountIds: ['acc-004', 'acc-005'], posture: { status: 'within', tolerance: { band: 'Moderate Conservative' } } })
  })

  it('a glide path is left out of the whole, as it is left out of the tolerance', () => {
    expect(clientRiskOf('cli-011')?.accountIds).not.toContain('acc-029')
  })

  it('Book risk counts clients above and below their bands apart, and the accounts needing a recorded reason', () => {
    const v = book()
    expect(v.clients.find((c) => c.clientId === 'cli-001')?.posture.status).toBe('within')
    expect(v.clientsAbove).toBe(v.clients.filter((c) => c.posture.status === 'above').length)
    expect(v.clientsBelow).toBe(v.clients.filter((c) => c.posture.status === 'below').length)
    expect(v.needingReason).toBe(accounts.filter(isModelManaged).filter((a) => rebalance(a.id) !== undefined).length)
  })
})

describe('asset location', () => {
  it("Robert's IRA, below his band on the Conservative model with its holdings on the model, reads asset location; it raises no suitability flag", () => {
    const ira = book().rows.find((r) => r.accountId === 'acc-003')
    expect(ira).toMatchObject({ assetLocation: true, posture: { status: 'below' } })
    expect(modelAboveTolerance(account('acc-003'), [])).toBeUndefined()
  })

  it("Robert's taxable account is not asset location: its holdings drifted past the Growth model's band, so it stays flagged", () => {
    const individual = book().rows.find((r) => r.accountId === 'acc-002')
    expect(individual).toMatchObject({ assetLocation: false, posture: { status: 'above', score: 89 } })
    expect(bandFor(89).label).not.toBe(bandFor(modelScoreOf(account('acc-002')) ?? 0).label)
  })

  it('every asset-location account runs the way its tax treatment allows, its holdings sit on its model, and its client is within the band as a whole', () => {
    const v = book()
    const within = new Set(v.clients.filter((c) => c.posture.status === 'within').map((c) => c.clientId))
    const marked = v.rows.filter((r) => r.assetLocation)
    expect(marked.map((r) => r.accountId)).toEqual(['acc-003', 'acc-047'])
    for (const r of marked) {
      const a = account(r.accountId)
      const model = modelScoreOf(a)
      if (model === undefined) throw new Error(`${a.id} has no model`)
      const tolerance = bandFor(clients.find((c) => c.id === a.clientId)?.riskProfile.score ?? Number.NaN)
      expect(within.has(a.clientId), a.id).toBe(true)
      expect(bandFor(r.posture.score).profile, a.id).toBe(bandFor(model).profile)
      if (a.taxTreatment === 'tax_deferred') expect(model, a.id).toBeLessThan(tolerance.floor)
      else expect(model, a.id).toBeGreaterThan(tolerance.ceiling)
    }
  })
})

describe('model above tolerance', () => {
  beforeEach(() => resetWorkspaceStore())

  it("Growth sits above Robert Johnson's Moderate tolerance; after a rebalance his accounts as a whole would score 46, within it", () => {
    const gap = rebalance('acc-002')
    expect(gap).toMatchObject({ modelName: 'Growth', modelScore: 66, clientName: 'Robert Johnson', wholeAfter: { score: 46, status: 'within' } })
    expect(gap?.modelBand.label).toBe('Moderate Aggressive')
    expect(gap?.tolerance.label).toBe('Moderate')
    expect(toleranceLine('Growth', 'Robert Johnson', 'Moderate', 'within', 'proposal')).toBe(
      "Growth sits above Robert Johnson's Moderate tolerance for this account; after this proposal, Robert Johnson's accounts as a whole would sit within it",
    )
  })

  it('accounts as a whole outside the band too read as the stronger warning', () => {
    expect(rebalance('acc-017')).toMatchObject({ clientName: 'Jennifer Martinez', wholeAfter: { status: 'above' } })
    expect(toleranceLine('Growth', 'Jennifer Martinez', 'Moderate', 'above', 'rebalance')).toBe(
      "Growth sits above Jennifer Martinez's Moderate tolerance for this account, and after a rebalance to the model Jennifer Martinez's accounts as a whole would sit above it too",
    )
  })

  it('every Johnson version carries it as a warning on no leg, read after the proposal, and nothing blocks because of it', () => {
    const v1 = versionOf(1, AGENT_CONSTRAINTS)
    const check = v1.pretrade.violations.find((v) => v.category === 'model_above_tolerance')
    expect(check).toMatchObject({
      severity: 'warning', legs: [],
      tolerance: { modelName: 'Growth', modelScore: 66, clientName: 'Robert Johnson', toleranceBand: 'Moderate', wholeAfterStatus: 'within', wholeAfterScore: 46 },
    })
    expect(check?.message).toBe(
      "Growth sits above Robert Johnson's Moderate tolerance for this account; after this proposal, Robert Johnson's accounts as a whole would sit within it. "
      + 'The model scores 66 pts against a Moderate band of 41–55 pts, and the accounts as a whole would sit at 46 pts. Approving it needs a suitability reason.',
    )
    expect(needsSuitabilityReason(v1.pretrade)).toBe(true)
    const others = v1.pretrade.violations.filter((v) => v.category !== 'model_above_tolerance')
    expect(v1.pretrade.passed).toBe(others.every((v) => v.severity !== 'block'))
  })

  it('a model within the tolerance adds nothing', () => {
    const within = accounts.filter(isModelManaged).find((a) => !GLIDE_PATH_MODELS.has(a.modelId) && modelAboveTolerance(a, []) === undefined)
    if (!within) throw new Error('the book has no account inside its tolerance')
    const empty = { accountId: within.id, passed: true, violations: [], legs: [], projectedCash: 0, projectedCashPct: 0, minimumCash: 0 }
    expect(withSuitability(empty, within, [])).toEqual(empty)
  })

  it('a glide path and a custom mandate are never measured against the tolerance', () => {
    for (const a of accounts.filter((x) => !isModelManaged(x) || GLIDE_PATH_MODELS.has(x.modelId))) expect(modelAboveTolerance(a, []), a.id).toBeUndefined()
  })
})
