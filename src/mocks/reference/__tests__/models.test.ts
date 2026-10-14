import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { personById } from '@/mocks/data/people'
import { MODEL_RISK_PROFILES, MODEL_VERSIONS } from '@/mocks/data/model-governance'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { deriveBookAUM } from '@/lib/aum'
import { RISK_PROFILE_TABLE, bandFor } from '@/lib/risk-profile'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { isTradingDay } from '@/lib/trading-calendar'
import { isExternalRole } from '@/lib/external-party'
import { equityShareOf, modelBenchmark, modelDetail, modelQuote, modelVolatility, modelsView } from '../models'
import { riskScoreOf } from '../risk-score'
import { isModelManaged } from '@/lib/mandate'

const targetsOf = (modelId: string) => new Map((MODEL_DEFINITIONS.find((m) => m.id === modelId)?.assetClasses ?? []).map((a) => [a.assetClass, a.targetWeight]))
const versionsOf = (modelId: string) => MODEL_VERSIONS.filter((v) => v.modelId === modelId).sort((a, b) => a.version - b.version)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('benchmarks are named for what is computed', () => {
  it('each model has its policy benchmark; the 529 model its glide path', () => {
    expect(MODEL_DEFINITIONS.map((m) => [m.id, modelBenchmark(m.id).name, modelBenchmark(m.id).kind])).toEqual([
      ['mod-001', 'Balanced Growth policy benchmark', 'policy_blend'],
      ['mod-002', 'Growth policy benchmark', 'policy_blend'],
      ['mod-003', 'Conservative Income policy benchmark', 'policy_blend'],
      ['mod-004', 'Aggressive Growth policy benchmark', 'policy_blend'],
      ['mod-005', 'Ultra-HNW Multi-Strategy policy benchmark', 'policy_blend'],
      ['mod-006', 'Education 529 glide-path benchmark', 'glide_path'],
      ['mod-007', 'Moderate Balanced policy benchmark', 'policy_blend'],
    ])
  })

  it("holds every sleeve at the model's target weight, so its equity share is the model's", () => {
    for (const m of MODEL_DEFINITIONS) {
      const b = modelBenchmark(m.id)
      expect(new Map(b.components.map((c) => [c.assetClass, c.weight])), m.id).toEqual(new Map([...targetsOf(m.id)].filter(([, w]) => w > 0)))
      expect(b.components.reduce((s, c) => s + c.weight, 0), m.id).toBeCloseTo(1, 12)
      const equity = b.components.filter((c) => ['us_equity', 'intl_equity', 'emerging_markets'].includes(c.assetClass)).reduce((s, c) => s + c.weight, 0)
      expect(equity, m.id).toBeCloseTo(equityShareOf(m.id), 12)
    }
  })

  it('names the index each sleeve is measured by', () => {
    for (const m of MODEL_DEFINITIONS) {
      const index = (ac: string) => modelBenchmark(m.id).components.find((c) => c.assetClass === ac)?.index
      expect(index('fixed_income'), m.id).toBe('Bloomberg US Aggregate')
      expect(index('us_equity'), m.id).toBe('MSCI USA IMI')
      const hasEm = (targetsOf(m.id).get('emerging_markets') ?? 0) > 0
      expect(index('intl_equity'), m.id).toBe(hasEm ? 'MSCI EAFE' : 'MSCI ACWI ex USA IMI')
    }
  })

  it('no stale or invented benchmark label survives in the engine', () => {
    const pms = readFileSync('src/mocks/handlers/pms.ts', 'utf8')
    expect(pms).not.toMatch(/Barclays|Custom Blended|Age-Based Glide|Model policy blend|benchmark: 'MSCI ACWI'/)
  })
})

describe('governance history', () => {
  it("every version's targets sum to one", () => {
    for (const v of MODEL_VERSIONS) expect(v.targets.reduce((s, t) => s + t.targetWeight, 0), `${v.modelId} v${v.version}`).toBeCloseTo(1, 12)
  })

  it('versions run one, two, three…; the current version is the latest approved one and its targets are the model\'s', () => {
    for (const m of MODEL_DEFINITIONS) {
      const versions = versionsOf(m.id)
      expect(versions.map((v) => v.version), m.id).toEqual(versions.map((_, i) => i + 1))
      const approved = versions.filter((v) => v.status === 'approved')
      const current = approved[approved.length - 1]
      expect(new Map(current?.targets.map((t) => [t.assetClass, t.targetWeight])), m.id).toEqual(targetsOf(m.id))
      expect(modelsView('user-001')?.models.find((x) => x.id === m.id)?.currentVersion, m.id).toBe(current?.version)
      for (const pending of versions.filter((v) => v.status === 'pending_approval')) expect(pending.version, m.id).toBeGreaterThan(current?.version ?? 0)
    }
  })

  it('an approved version took effect by today, after its approval, both on trading days; a pending one takes effect later', () => {
    for (const v of MODEL_VERSIONS) {
      const label = `${v.modelId} v${v.version}`
      expect(isTradingDay(v.effectiveDate), label).toBe(true)
      if (v.status === 'approved') {
        expect(v.effectiveDate <= MOCK_TODAY_ISO, label).toBe(true)
        expect(v.approvedOn && isTradingDay(v.approvedOn), label).toBe(true)
        expect((v.approvedOn ?? '') <= v.effectiveDate, label).toBe(true)
      } else {
        expect(v.effectiveDate > MOCK_TODAY_ISO, label).toBe(true)
        expect(v.approvedOn, label).toBeUndefined()
      }
    }
    expect(MODEL_VERSIONS.find((v) => v.modelId === 'mod-005' && v.version === 3)).toMatchObject({ status: 'pending_approval', effectiveDate: '2026-04-01' })
  })

  it("each version's weight changes are exactly the difference from the version before", () => {
    for (const m of MODEL_DEFINITIONS) {
      const versions = versionsOf(m.id)
      for (let i = 1; i < versions.length; i++) {
        const [prev, next] = [versions[i - 1]!, versions[i]!]
        const before = new Map<string, number>(prev.targets.map((t) => [t.assetClass, t.targetWeight]))
        const after = new Map<string, number>(next.targets.map((t) => [t.assetClass, t.targetWeight]))
        const moved = [...new Set([...before.keys(), ...after.keys()])].filter((ac) => (before.get(ac) ?? 0) !== (after.get(ac) ?? 0)).sort()
        const changes = next.changes.filter((c) => c.type === 'weight_change')
        expect(changes.map((c) => c.assetClass).sort(), `${m.id} v${next.version}`).toEqual(moved)
        for (const c of changes) {
          expect(c.oldValue, `${m.id} v${next.version} ${c.assetClass}`).toBe(before.get(c.assetClass ?? '') ?? 0)
          expect(c.newValue, `${m.id} v${next.version} ${c.assetClass}`).toBe(after.get(c.assetClass ?? '') ?? 0)
        }
      }
    }
  })

  it('is proposed by a firm person and approved by the Investment Committee; the invented authors are gone', () => {
    for (const v of MODEL_VERSIONS) {
      const person = personById(v.proposedBy)
      expect(person && !isExternalRole(person.role), `${v.modelId} v${v.version}`).toBe(true)
      if (v.status === 'approved') expect(v.approvedBy).toBe('Investment Committee')
    }
    for (const file of sourceFiles('src')) expect(readFileSync(file, 'utf8'), file).not.toMatch(/Sarah Kim|David Park/)
  })

  it("each model's risk profile is the band that names it in the firm's table", () => {
    for (const band of RISK_PROFILE_TABLE) expect(MODEL_RISK_PROFILES[band.modelId], band.modelId).toBe(band.profile)
  })
})

describe('risk profiles are the bands the models score in', () => {
  it("every model's risk score falls inside the band it is labelled with", () => {
    for (const m of MODEL_DEFINITIONS) {
      const profile = MODEL_RISK_PROFILES[m.id]
      expect(bandFor(riskScoreOf(modelVolatility(m.id))).profile, m.id).toBe(profile)
    }
  })

  it("separates the bands: each band's model is at least half a percentage point of σ riskier than the band below's", () => {
    const vols = RISK_PROFILE_TABLE.map((b) => modelVolatility(b.modelId))
    vols.slice(1).forEach((vol, i) => expect(vol - vols[i]!, RISK_PROFILE_TABLE[i + 1]!.modelId).toBeGreaterThanOrEqual(0.005))
  })

  it('names mod-005 by the band its volatility scores, Moderate', () => {
    expect(MODEL_RISK_PROFILES['mod-005']).toBe('moderate')
  })
})

describe('models in the book', () => {
  it('assigned accounts and value reconcile to the accounts that carry each model, in USD', () => {
    const models = modelsView('user-001')?.models ?? []
    expect(models.reduce((s, m) => s + m.assignedAccounts, 0)).toBe(accounts.filter(isModelManaged).length)
    for (const m of models) {
      const own = accounts.filter(isModelManaged).filter((a) => a.modelId === m.id)
      expect(m.assignedAccounts, m.id).toBe(own.length)
      expect(m.totalValue, m.id).toBeCloseTo(deriveBookAUM(own, FX_RATES_USD_BASE), 4)
    }
  })

  it("a model's detail lists its targets with vehicles and indexes, its history and its accounts", () => {
    const detail = modelDetail('user-001', 'mod-005')
    expect(detail?.targets.find((t) => t.assetClass === 'alternatives')).toMatchObject({ targetWeight: 0.15, implementationSymbol: 'QAI', index: 'HFRX Global Hedge Fund' })
    expect(detail?.versions.map((v) => [v.version, v.status, v.proposedByName])).toEqual([[1, 'approved', 'Mike Chen'], [2, 'approved', 'Mike Chen'], [3, 'pending_approval', 'Mike Chen']])
    expect(detail?.pendingVersion).toEqual({ version: 3, effectiveDate: '2026-04-01' })
    expect(detail?.accounts.map((a) => a.accountId)).toEqual(accounts.filter(isModelManaged).filter((a) => a.modelId === 'mod-005').map((a) => a.id))
    expect(modelDetail('user-001', 'mod-999')).toBeUndefined()
  })

  it('is firm only, states its methods, and quotes a model and a version', () => {
    expect(modelsView('cli-001')).toBeUndefined()
    expect(modelDetail('prsp-011', 'mod-001')).toBeUndefined()
    expect(modelsView('user-001')?.methods.filter((n) => n.modeled).map((n) => n.label)).toEqual(['Volatility'])
    const model = modelQuote('mod-002')
    expect(model).toMatchObject({ view: 'models', subject: { type: 'model', id: 'mod-002' }, threadTitle: 'Model · Growth' })
    const version = modelQuote('mod-005:v3')
    expect(version?.claim).toBe('A pending version of Ultra-HNW Multi-Strategy changes its alternatives and fixed income targets.')
    expect(modelQuote('mod-001:v3')?.claim).toBe('An approved version of Balanced Growth changed its emerging markets and fixed income targets.')
    expect(modelQuote('mod-002:v2')?.claim).toBe('An approved version of Growth changed its international equity and US equity targets.')
    expect(version?.figures.map((f) => [f.label, f.unit])).toEqual([['Alternatives target', 'pp'], ['Fixed Income target', 'pp']])
    expect(modelQuote('mod-005:v9')).toBeUndefined()
    expect(modelQuote('mod-999')).toBeUndefined()
  })
})

describe('accounts in transition', () => {
  it('the Model page rows carry the transition from the account record, only for accounts that have one', () => {
    const rows = (modelId: string) => modelDetail('user-001', modelId)?.accounts ?? []
    const mueller = rows('mod-001').find((a) => a.accountId === 'acc-043')
    expect(mueller).toMatchObject({ withinBand: false, transition: { kind: 'in_kind_transfer', since: '2026-01-14' } })
    expect(rows('mod-003').find((a) => a.accountId === 'acc-044')).toMatchObject({ withinBand: false, transition: { kind: 'in_kind_transfer', since: '2026-02-04' } })
    const withTransition = [...rows('mod-001'), ...rows('mod-003')].filter((a) => a.transition).map((a) => a.accountId)
    expect(withTransition).toEqual(['acc-043', 'acc-044'])
  })

  it('governance Methods says accounts transferred in kind are staged and shown outside band', () => {
    const note = modelDetail('user-001', 'mod-001')?.methods.find((n) => n.label === 'Transfers in kind')
    expect(note).toMatchObject({ modeled: false })
    expect(note?.text).toContain('transferred in kind')
    expect(note?.text).toContain('tax-aware stages')
    expect(note?.text).toContain('outside band')
  })
})

it("a model's description carries no figure: the engine's equity share and weights sit beside it", () => {
  for (const m of MODEL_DEFINITIONS) expect(m.description, m.id).not.toMatch(/\d/)
})
