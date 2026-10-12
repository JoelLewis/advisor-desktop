import type { Account } from '@/types/account'
import type { ProposedTrade } from '@/services/oms'
import type { ProposedTradeLeg, RebalanceProposal } from './oms'
import { hasUnwashedLossShares, matchWashedShares, washedLoss, type Acquisition, type SoldLossLot, type WashedShares } from '@/lib/wash-sale'
import { isSubjectToWashSale, taxCharacterOf } from '@/lib/security-master'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { washSaleWindow } from '../data/realised-sales'
import { generateTaxLots, washSaleAcquisitions, type CustodianLot } from './custodian'
import { washSaleTaxpayer } from './tax-return'

/** What one sell leg disposes of: every lot it draws on, and the shares of each it sells at a loss. */
export type LegSale = { soldLosses: readonly SoldLossLot[]; consumedLotIds: readonly string[] }

/** Settlement needs only the legs and what they sell. */
type BatchEntry = { account: Account } & Pick<RebalanceProposal, 'legs' | 'sales'>

const NOTHING_SOLD: LegSale = { soldLosses: [], consumedLotIds: [] }

/**
 * §0.2 · the IRC §1091 consequences of executing a whole batch today, settled across each wash-sale
 * taxpayer's accounts at once:
 * - Replacement shares are the taxpayer's purchases in the last 30 days (IRAs and Roths included)
 *   **and every buy the batch itself proposes in any of the taxpayer's accounts**, dated today.
 *   Lots the batch sells are never replacements. Loss lots from all the taxpayer's accounts
 *   compete for the same replacement shares, earliest-bought first (`matchWashedShares`), so one
 *   replacement share washes one sold share, never two.
 * - A sell leg's washed dollars become `washedLoss` (deferred into a taxable replacement's basis,
 *   or disallowed by an IRA or Roth one), and its window `repurchaseBlockedUntil` opens while any
 *   loss share it sells is left unwashed.
 * - A buy of a symbol the taxpayer's batch sells at a loss is itself the wash, so it is flagged
 *   `washSaleRisk`; so is a sell leg any of whose loss washes.
 * Directly held coins are outside §1091 throughout (`isSubjectToWashSale`).
 *
 * The trades are the generator's; only these three fields change. Returns each entry's legs.
 */
export function settleBatchWashSales(batch: readonly BatchEntry[], asOfISO: string): ProposedTradeLeg[][] {
  const settled = new Map<BatchEntry, ProposedTradeLeg[]>()
  const lotsCache = new Map<string, CustodianLot[]>()
  const lotsFor = (a: Account) => {
    const cached = lotsCache.get(a.id)
    if (cached) return cached
    const lots = generateTaxLots(a.id, a.totalValue)
    lotsCache.set(a.id, lots)
    return lots
  }
  const byTaxpayer = new Map<string, BatchEntry[]>()
  for (const entry of batch) {
    const taxpayer = washSaleTaxpayer(entry.account)
    byTaxpayer.set(taxpayer, [...(byTaxpayer.get(taxpayer) ?? []), entry])
  }
  for (const entries of byTaxpayer.values()) {
    const sales = new Map(entries.flatMap((e) => [...e.sales]))
    // A buy disposes of nothing; a sell without its lots would settle as if it sold no loss shares.
    const saleOf = (leg: ProposedTradeLeg): LegSale => {
      const sale = sales.get(leg)
      if (sale) return sale
      if (leg.side === 'buy') return NOTHING_SOLD
      throw new Error(`settleBatchWashSales: the ${leg.symbol} sale carries no record of the lots it sells`)
    }
    const allLegs = entries.flatMap((e) => e.legs)
    const sold = new Set(allLegs.flatMap((leg) => saleOf(leg).consumedLotIds))
    const held = washSaleAcquisitions(entries[0]!.account, lotsFor).filter((a) => !sold.has(a.lotId))
    const proposedBuys: Acquisition[] = entries.flatMap(({ account, legs }) => legs
      .filter((leg) => leg.side === 'buy')
      .map((leg) => ({
        symbol: leg.symbol,
        date: asOfISO,
        lotId: `proposed:${account.id}:${leg.symbol}`,
        quantity: leg.quantity,
        account: isTaxableAccount(account.taxTreatment) ? 'taxable' : 'tax_advantaged',
      })))
    const lossLots = allLegs.flatMap((leg) => saleOf(leg).soldLosses)
    const shares = matchWashedShares(lossLots, [...held, ...proposedBuys], asOfISO)
    const soldAtLoss = new Set(lossLots.map((l) => l.symbol).filter(isSubjectToWashSale))
    const windowEnd = washSaleWindow(asOfISO).end

    for (const entry of entries) {
      settled.set(entry, entry.legs.map((leg) => {
        if (leg.side === 'buy') {
          return soldAtLoss.has(leg.symbol) ? { ...leg, washSaleRisk: true } : leg
        }
        const { soldLosses } = saleOf(leg)
        const washed = roundedWashedLoss(soldLosses, shares, leg.symbol)
        return {
          ...leg,
          washSaleRisk: leg.washSaleRisk || washed !== undefined,
          ...(washed ? { washedLoss: washed } : {}),
          ...(hasUnwashedLossShares(soldLosses, shares) ? { repurchaseBlockedUntil: windowEnd } : {}),
        }
      }))
    }
  }
  return batch.map((entry) => settled.get(entry) ?? entry.legs)
}

function roundedWashedLoss(
  soldLosses: readonly SoldLossLot[],
  shares: ReadonlyMap<string, WashedShares>,
  symbol: string,
): ProposedTrade['washedLoss'] {
  const washed = washedLoss(soldLosses, shares)
  const shortTerm = Math.round(washed.shortTerm)
  const longTerm = Math.round(washed.longTerm)
  if (shortTerm === 0 && longTerm === 0) return undefined
  const deferred = Math.round(washed.deferred)
  return {
    shortTerm,
    longTerm,
    collectibleLongTerm: taxCharacterOf(symbol) === 'collectible' ? longTerm : 0,
    deferred,
    disallowed: shortTerm + longTerm - deferred,
  }
}
