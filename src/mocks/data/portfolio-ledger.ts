import type { PositionSeed } from '@/types/portfolio'
import type { Fill } from '@/types/workspace-proposal'
import type { CustodianLot } from '@/mocks/handlers/custodian'
import type { RealizedSale } from './realized-sales'

/**
 * The session's portfolio ledger: every account the session has moved, with its positions and lots
 * as they stand after its fills, the realized sales those fills recorded, and the fills themselves.
 * An account with no entry is the fixture's. This module imports types only, so the fixture readers
 * (`positions.ts`, `custodian.ts`, `realized-sales.ts`) can consult it without an import cycle.
 */

/** A lot as the ledger keeps it: `repurchaseBlockedUntil` is read from the open windows at read time, never stored. */
export type LedgerLot = Omit<CustodianLot, 'repurchaseBlockedUntil'>
/** One account's book after it has moved: positions weightless, as `positions.ts` stores them, and lots. */
export type AccountBook = { positions: PositionSeed[]; lots: LedgerLot[] }

type LedgerState = { books: Map<string, AccountBook>; sales: RealizedSale[]; fills: Fill[]; version: number }

const empty = (): LedgerState => ({ books: new Map(), sales: [], fills: [], version: 0 })
let ledger = empty()

export function bookOf(accountId: string): AccountBook | undefined {
  return ledger.books.get(accountId)
}

export const recordedSales = (): readonly RealizedSale[] => ledger.sales
export const ledgerFills = (): readonly Fill[] => ledger.fills
/** How many times the book has moved this session; 0 is the fixtures' book. */
export const bookVersion = (): number => ledger.version

/** One release, committed whole: the account's new book, the sales it recorded and its fills. */
export function commitMove(accountId: string, book: AccountBook, sales: readonly RealizedSale[], fills: readonly Fill[]): void {
  ledger.books.set(accountId, book)
  ledger.sales.push(...sales)
  ledger.fills.push(...fills)
  ledger.version += 1
}

export function resetLedger(): void {
  ledger = empty()
}
