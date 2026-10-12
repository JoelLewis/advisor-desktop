import { describe, it, expect } from 'vitest'
import { nbas, driftBatchFacts } from '@/mocks/data/nbas'
import { getNBAs } from '@/services/nba'
import { activities } from '@/mocks/data/activities'
import { MOCK_NOTIFICATIONS } from '@/mocks/data/notifications'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { computeDriftForAccount, modelDisplayName, MODEL_DEFINITIONS } from '@/mocks/handlers/pms'
import { formatRatePercent } from '@/lib/tax-rules'

const drifted = accounts.map((a) => ({ account: a, drift: computeDriftForAccount(a) })).filter(({ drift }) => drift.needsRebalance)
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

  it('ntf-010 names the Growth model and counts its drifted accounts', () => {
    const ntf = MOCK_NOTIFICATIONS.find((n) => n.id === 'ntf-010')!
    const onGrowth = drifted.filter(({ account }) => account.modelId === 'mod-002').length
    expect(ntf.body).toContain(`${onGrowth} accounts on the Growth model`)
    expect(ntf.body).toContain(bandOf('mod-002'))
    expect(ntf.body).not.toContain('Growth Equity')
  })

  it('no notification names a model that does not exist', () => {
    const names = new Set(MODEL_DEFINITIONS.map((m) => m.name))
    for (const ntf of MOCK_NOTIFICATIONS) {
      for (const [, name] of ntf.body.matchAll(/Model "([^"]+)"/g)) expect(names, `${ntf.id} names "${name}"`).toContain(name)
      expect(ntf.body, ntf.id).not.toContain('Growth Equity')
    }
  })
})

describe('nba-001 over the wire', () => {
  it('the NBA endpoint serves the derived figures, not empty getters', async () => {
    const served = (await getNBAs()).find((n) => n.id === 'nba-001')!
    const facts = driftBatchFacts()
    expect(served.title).toContain(`${facts.accountCount} accounts`)
    expect(served.clients).toEqual(facts.clients)
    expect(served.trigger.value).toBe(nbas.find((n) => n.id === 'nba-001')!.trigger.value)
  })
})
