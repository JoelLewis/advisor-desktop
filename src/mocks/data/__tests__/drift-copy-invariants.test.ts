import { describe, it, expect } from 'vitest'
import { activities } from '@/mocks/data/activities'
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { formatRatePercent } from '@/lib/tax-rules'
import { isModelManaged } from '@/lib/mandate'

const drifted = accounts.filter(isModelManaged).map((a) => ({ account: a, drift: computeDriftForAccount(a) })).filter(({ drift }) => drift.needsRebalance)
const bandOf = (modelId: string) => `${modelDisplayName(modelId)} ±${formatRatePercent(computeDriftForAccount(drifted.find(({ drift }) => drift.modelId === modelId)!.account).driftTolerance)}`

describe('§0.7 · drift copy states each account\'s own band and the engine\'s count', () => {
  it('act-012 reports the same count and bands', () => {
    const act = activities.find((a) => a.id === 'act-012')!
    expect(act.title).toContain(`${drifted.length} accounts`)
    expect(act.title).not.toContain('3%')
    for (const modelId of new Set(drifted.map(({ drift }) => drift.modelId))) expect(act.description).toContain(bandOf(modelId))
  })
})
