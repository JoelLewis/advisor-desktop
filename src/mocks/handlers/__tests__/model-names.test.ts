import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { modelDisplayName } from '@/mocks/handlers/pms'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { isModelManaged } from '@/lib/mandate'

describe('§0.4 · every model reference resolves to its display name', () => {
  it('mod-002 is "Growth"', () => {
    expect(modelDisplayName('mod-002')).toBe('Growth')
  })
  it('every model id an account uses has a name', () => {
    for (const account of accounts.filter(isModelManaged)) {
      expect(modelDisplayName(account.modelId), account.id).toBe(MODEL_DEFINITIONS.find((m) => m.id === account.modelId)!.name)
    }
  })
  it('an unknown model id is an error, not another model\'s name', () => {
    expect(() => modelDisplayName('mod-999')).toThrow('no model mod-999')
  })
})
