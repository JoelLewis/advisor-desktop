import { describe, it, expect } from 'vitest'
import { getDrift } from '@/services/pms'
import { isModelManaged } from '@/lib/mandate'
import { accounts } from '@/mocks/data/accounts'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { computeDriftForAccount } from '@/mocks/handlers/pms'

const driftOfEveryModelManagedAccount = () => accounts.filter(isModelManaged).map((a) => computeDriftForAccount(a))

describe('drift calculation invariants', () => {
  it('drift signed: |drift| === |actual - target| within rounding tolerance', async () => {
    const drifts = driftOfEveryModelManagedAccount()
    for (const d of drifts) {
      for (const ac of d.assetClassDrifts) {
        const expected = Math.abs(ac.actual - ac.target)
        expect(Math.abs(Math.abs(ac.drift) - expected)).toBeLessThan(0.002)
      }
    }
  })

  // C24: totalDrift is the classic half-sum-of-absolute-deviations metric — since actual and
  // target weights each sum to ~1.0, every overweight class is balanced by an underweight
  // elsewhere, so |drift| double-counts the imbalance and must be halved. This is a different
  // quantity from the per-class breach that drives needsRebalance (see below).
  it('totalDrift === sum(|drift|) / 2 within rounding tolerance', async () => {
    const drifts = driftOfEveryModelManagedAccount()
    for (const d of drifts) {
      const sumAbsDrifts = d.assetClassDrifts.reduce((s, ac) => s + Math.abs(ac.drift), 0)
      const expected = sumAbsDrifts / 2
      expect(Math.abs(d.totalDrift - expected)).toBeLessThan(0.002)
    }
  })

  // C24 · Correction 2 — the old assertion was `needsRebalance === totalDrift > 0.03`, a single
  // global constant. Per-model bands (mod-003: 3%, mod-004: 7%, the rest: 5%) mean that no longer
  // holds; reformulated against each account's OWN model band, gated on the single worst
  // asset-class breach (not totalDrift, the aggregate). The expected bands are hardcoded here,
  // independent of what the API reports — read from live governance data, not copied off
  // `d.driftTolerance` — so a wrong `driftTolerance` in the response can't make this test pass by
  // agreeing with itself. acc-047 (mod-007, 5% band) is the account in this fixture set that
  // exercises the difference from the old flat 0.03: its worst asset-class drift is exactly 5%,
  // so `totalDrift > 0.03` (the old rule) would flag it, but `needsRebalance` correctly reports
  // false because 5% does not exceed its own 5% band. mod-003 (e.g. acc-003, 3% band) and mod-004
  // (e.g. acc-004, 7% band) are the accounts whose bands differ from the 5% most other models
  // share, exercised by the "models with different bands" test below.
  const EXPECTED_MODEL_BANDS: Record<string, number> = {
    'mod-001': 0.05, 'mod-002': 0.05, 'mod-003': 0.03, 'mod-004': 0.07,
    'mod-005': 0.05, 'mod-006': 0.05, 'mod-007': 0.05,
  }

  it("needsRebalance === (max asset-class |drift|) > the account's own model band, not a hardcoded 0.03", async () => {
    const drifts = driftOfEveryModelManagedAccount()
    for (const d of drifts) {
      const expectedBand = EXPECTED_MODEL_BANDS[d.modelId]
      if (expectedBand === undefined) throw new Error(`no expected band for model ${d.modelId}`)
      expect(d.driftTolerance).toBe(expectedBand)
      const maxAbsDrift = Math.max(...d.assetClassDrifts.map((ac) => Math.abs(ac.drift)))
      expect(d.needsRebalance).toBe(maxAbsDrift > expectedBand)
    }
  })

  it('C24: models with different bands are not treated identically', async () => {
    const drifts = driftOfEveryModelManagedAccount()
    const tolerances = new Set(drifts.map((d) => d.driftTolerance))
    expect(tolerances.size).toBeGreaterThan(1)
    expect(tolerances).toContain(0.03)
    expect(tolerances).toContain(0.07)
  })

  it('C24: drift keeps its sign, so overweight and underweight are distinguishable', async () => {
    const drift = await getDrift('acc-001')
    expect(drift.assetClassDrifts.some((a) => a.drift > 0)).toBe(true)
    expect(drift.assetClassDrifts.some((a) => a.drift < 0)).toBe(true)
    for (const a of drift.assetClassDrifts) {
      // drift is published rounded to 4dp, so compare within that rounding, not at full precision.
      expect(Math.abs(a.drift - (a.actual - a.target))).toBeLessThan(0.0001)
    }
  })

  it('signed drifts sum to approximately zero — every overweight is someone else underweight', async () => {
    const drift = await getDrift('acc-001')
    expect(drift.assetClassDrifts.reduce((s, a) => s + a.drift, 0)).toBeCloseTo(0, 2)
  })

  // Tight on purpose: computeDriftForAccount normalizes each position's weight by the account's
  // own total position weight before summing into asset-class buckets. Raw (unnormalized) weights
  // sum to 0.999–1.001 across the fixture set (e.g. acc-045) — inside the old ±0.05 tolerance this
  // test used to have, so removing the normalization passed silently. ±0.0005 catches it.
  it('actual weights sum to 1.0 for each account (normalized, not just close)', async () => {
    const drifts = driftOfEveryModelManagedAccount()
    for (const d of drifts) {
      const sumActual = d.assetClassDrifts.reduce((s, ac) => s + ac.actual, 0)
      expect(Math.abs(sumActual - 1.0)).toBeLessThan(0.0005)
    }
  })

  // C24 · Important #4 — maxAbsDrift is published once by the server and consumed everywhere
  // (RebalancePage's filter, SelectAccountsStep, the UI columns) instead of each recomputing
  // `Math.max(...|drift|)` independently. Pin the published field against the same computation
  // performed on the account's own assetClassDrifts, independent of needsRebalance.
  it('maxAbsDrift === max(|drift|) across the account\'s own asset classes', async () => {
    const drifts = driftOfEveryModelManagedAccount()
    for (const d of drifts) {
      const expected = Math.max(...d.assetClassDrifts.map((ac) => Math.abs(ac.drift)), 0)
      expect(Math.abs(d.maxAbsDrift - expected)).toBeLessThan(0.0001)
    }
  })

  it('all 7 models have target weights that sum to 1.0', async () => {
    const models = MODEL_DEFINITIONS
    expect(models).toHaveLength(7)
    for (const model of models) {
      const sumTargets = (model as unknown as { assetClasses: { targetWeight: number }[] })
        .assetClasses.reduce((s: number, ac: { targetWeight: number }) => s + ac.targetWeight, 0)
      expect(sumTargets).toBeCloseTo(1.0, 2)
    }
  })

  it('returns drift data for the 44 model-managed accounts, none for the three custom mandates', async () => {
    const drifts = driftOfEveryModelManagedAccount()
    expect(drifts).toHaveLength(44)
    expect(drifts.map((d) => d.accountId)).not.toContain('acc-041')
  })

  it('acc-001 has drift data with valid structure', async () => {
    const drifts = driftOfEveryModelManagedAccount()
    const acc001 = drifts.find((d) => d.accountId === 'acc-001')
    expect(acc001).toBeDefined()
    expect(acc001!.assetClassDrifts.length).toBeGreaterThan(0)
    expect(acc001!.lastCalculated).toBeTruthy()
  })
})
