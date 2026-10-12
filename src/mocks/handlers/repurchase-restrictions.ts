import type { Account } from '@/types/account'
import type { ProposedTrade, RepurchaseRestriction } from '@/services/oms'
import { washSaleWindow } from '../data/realised-sales'
import { openWashSaleWindowsFor, sameWashSaleTaxpayer } from './tax-return'

/** The legs of one account's proposal, as far as a restriction list needs them. */
export type ProposalLegs = { accountId: string; legs: readonly Pick<ProposedTrade, 'symbol' | 'repurchaseBlockedUntil'>[] }

/**
 * §0.2 · the IRC §1091 repurchase restrictions on `account`: every open window a recorded loss
 * sale by its wash-sale taxpayer opened, and every window a proposed loss leg in `proposals` by
 * that taxpayer would open if executed on `asOfISO`. The scope is the taxpayer, not the household
 * (`washSaleTaxpayer`): a purchase in the owner's or spouse's IRA washes the loss, while an
 * irrevocable trust in the same household neither washes it nor is restricted by it.
 *
 * Recorded and projected windows stay separate entries with their own source, never merged into
 * one "latest" date per symbol.
 */
export function repurchaseRestrictionsFor(
  account: Account,
  asOfISO: string,
  proposals: readonly ProposalLegs[],
): RepurchaseRestriction[] {
  const recorded: RepurchaseRestriction[] = openWashSaleWindowsFor(account, asOfISO).map((w) => ({
    symbol: w.symbol,
    start: w.start,
    until: w.end,
    source: { kind: 'recorded', saleId: w.id, accountId: w.accountId, saleDate: w.saleDate },
  }))
  const sameTaxpayer = new Set(sameWashSaleTaxpayer(account).map((a) => a.id))
  const { start } = washSaleWindow(asOfISO)
  const projected = new Map<string, RepurchaseRestriction>()
  for (const { accountId, legs } of proposals) {
    if (!sameTaxpayer.has(accountId)) continue
    for (const leg of legs) {
      if (leg.repurchaseBlockedUntil === undefined) continue
      projected.set(`${accountId}:${leg.symbol}`, {
        symbol: leg.symbol,
        start,
        until: leg.repurchaseBlockedUntil,
        source: { kind: 'projected', accountId, saleDate: asOfISO },
      })
    }
  }
  return [...recorded, ...projected.values()]
    .sort((a, b) => a.until.localeCompare(b.until) || a.symbol.localeCompare(b.symbol))
}
