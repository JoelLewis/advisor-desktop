import type { Account, ModelManagedAccount } from '@/types/account'

export const isModelManaged = (account: Account): account is ModelManagedAccount => account.mandate === 'model'

/** An account that follows no firm model has no model to read; asking for one is a broken invariant, never a default. */
export class NotModelManagedError extends Error {
  constructor(readonly accountId: string) {
    super(`${accountId} is a custom mandate and follows no firm model`)
    this.name = 'NotModelManagedError'
  }
}

/** The model an account is measured against: the override when one is named, else its own; a custom mandate must name one. */
export function modelIdFor(account: Account, override?: string): string {
  if (override !== undefined) return override
  if (account.mandate === 'model') return account.modelId
  throw new NotModelManagedError(account.id)
}

/** The account narrowed to a model-managed one, for a path that only exists for one (a rebalance, a drift letter). */
export function requireModelManaged(account: Account): ModelManagedAccount {
  if (account.mandate !== 'model') throw new NotModelManagedError(account.id)
  return account
}
