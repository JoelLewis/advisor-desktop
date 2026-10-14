import { describe, it, expect } from 'vitest'
import { nbas } from '@/mocks/data/nbas'
import { activities } from '@/mocks/data/activities'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { formatRatePercent } from '@/lib/tax-rules'
import { isModelManaged } from '@/lib/mandate'

const drifted = accounts.filter(isModelManaged).map((a) => ({ account: a, drift: computeDriftForAccount(a) })).filter(({ drift }) => drift.needsRebalance)
const bandOf = (modelId: string) => `${modelDisplayName(modelId)} ±${formatRatePercent(computeDriftForAccount(drifted.find(({ drift }) => drift.modelId === modelId)!.account).driftTolerance)}`

describe('§0.7 · drift copy states each account\'s own band and the engine\'s count', () => {
  const nba = nbas.find((n) => n.id === 'nba-001')!

  it('nba-001 counts the accounts outside their own model band', () => {
    expect(drifted.length).toBeGreaterThan(0)
    expect(nba.title).toContain(`${drifted.length} accounts`)
    expect(nba.description).toContain(`${drifted.length} accounts across ${new Set(drifted.map(({ account }) => account.clientId)).size} clients`)
  })

  it('nba-001 names every breached model with its own band, and no flat 3% threshold', () => {
    for (const modelId of new Set(drifted.map(({ drift }) => drift.modelId))) {
      expect(nba.description).toContain(bandOf(modelId))
    }
    expect(nba.description).not.toContain('3% threshold')
  })

  it("nba-001's clients are exactly the drifted accounts' clients", () => {
    const expected = [...new Set(drifted.map(({ account }) => account.clientId))]
    expect(nba.clients.map((c) => c.id)).toEqual(expected)
    for (const c of nba.clients) expect(c.name).toBe(clients.find((x) => x.id === c.id)!.fullName)
  })

  it("nba-001's trigger range is the smallest and largest breach", () => {
    const breaches = drifted.map(({ drift }) => drift.maxAbsDrift)
    const pct = (f: number) => `${(f * 100).toFixed(1)}%`
    expect(nba.trigger.value).toBe(`${pct(Math.min(...breaches))}–${pct(Math.max(...breaches))}`)
  })

  it('act-012 reports the same count and bands', () => {
    const act = activities.find((a) => a.id === 'act-012')!
    expect(act.title).toContain(`${drifted.length} accounts`)
    expect(act.title).not.toContain('3%')
    for (const modelId of new Set(drifted.map(({ drift }) => drift.modelId))) expect(act.description).toContain(bandOf(modelId))
  })
})
