import type { Account } from '@/types/account'
import { ACCOUNT_TYPE_LABELS } from './labels'

/**
 * An account as an advisor names it: "Robert Johnson · Individual (…3847)", the last four digits from its number.
 * A named account ("Johnson Family Trust") keeps its name. For people reading; claims and titles keep `name`.
 */
export function accountDisplayName({ name, type, accountNumber }: Pick<Account, 'name' | 'type' | 'accountNumber'>): string {
  const lastFour = accountNumber.replace(/\D/g, '').slice(-4)
  if (lastFour.length !== 4) throw new Error(`Account number ${accountNumber} has no last four digits`)
  const typeLabel = ACCOUNT_TYPE_LABELS[type]
  const owner = name.endsWith(` ${typeLabel}`) ? name.slice(0, -(typeLabel.length + 1)) : undefined
  return `${owner ? `${owner} · ${typeLabel}` : name} (…${lastFour})`
}
