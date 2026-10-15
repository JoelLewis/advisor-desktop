import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount } from '../pms'
import { requireModelManaged } from '@/lib/mandate'
export { generateRebalanceTrades } from '../oms'

export function computeDriftForAccountById(id: string) {
  const account = accounts.find((a) => a.id === id)
  if (!account) throw new Error(`unknown account ${id}`)
  return computeDriftForAccount(requireModelManaged(account))
}
