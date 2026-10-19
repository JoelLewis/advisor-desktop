import { describe, it, expect, vi } from 'vitest'

const composing = vi.hoisted(() => ({ read: undefined as (() => unknown) | undefined }))
vi.mock('@/mocks/workspace/brief', () => ({ briefMessages: () => { composing.read?.(); return [] } }))

/** A fresh module: the test setup has already loaded the real one, with the real Brief. */
const freshStore = async () => {
  vi.resetModules()
  return import('../workspace-store')
}

describe('the workspace store while the morning Brief is composed', () => {
  it('refuses a re-entrant read, never serving a partial store, and seeds again afterwards', async () => {
    const { store, orderBook } = await freshStore()
    composing.read = store
    expect(() => store()).toThrow('re-entered while the morning Brief is composed')
    composing.read = undefined
    expect(orderBook().staged).toEqual([])
    expect(store().staged).toEqual([])
  })
  it('lets the ledger read the morning book while composing', async () => {
    const { store, orderBook } = await freshStore()
    composing.read = () => expect(orderBook()).toMatchObject({ staged: [] })
    expect(store().staged).toEqual([])
    composing.read = undefined
  })
})
