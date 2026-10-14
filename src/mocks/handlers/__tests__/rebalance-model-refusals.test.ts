import { describe, it, expect } from 'vitest'
import { ApiClientError } from '@/services/api-client'
import { previewRebalance } from '@/services/oms'
import { UnknownModelError } from '@/lib/mandate'
import { generateRebalanceProposal } from '@/mocks/handlers/oms'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { accounts } from '@/mocks/data/accounts'

async function statusOf(request: Promise<unknown>): Promise<number> {
  try {
    await request
  } catch (error) {
    if (error instanceof ApiClientError) return error.status
    throw error
  }
  throw new Error('the request was served; a refusal was expected')
}

describe('a model change is previewed, never executed', () => {
  it('previewing against an unknown model is a 422, not a server error', async () => {
    expect(await statusOf(previewRebalance({ accountIds: ['acc-001'], driftThreshold: 0.05, taxAware: true, modelId: 'mod-999' }))).toBe(422)
  })

  it('previewing a custom mandate against a named model is served', async () => {
    await expect(previewRebalance({ accountIds: ['acc-041'], driftThreshold: 0.05, taxAware: true, modelId: 'mod-001' })).resolves.toHaveLength(1)
  })
})

describe('an unknown model is a named error, not a bare Error', () => {
  it('names the model it could not find', () => {
    const account = accounts.find((a) => a.id === 'acc-001')!
    expect(() => generateRebalanceProposal(account.id, true, undefined, 'mod-999')).toThrow(UnknownModelError)
    expect(() => computeDriftForAccount(account, 'mod-999')).toThrow(UnknownModelError)
  })
})
