import type { Account } from '@/types/account'
import type { CurrencyCode } from '@/types/currency'
import { accounts } from '../data/accounts'
import { householdFixtures } from '../data/households'
import { realisedSales } from '../data/realised-sales'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { convertCurrency } from '@/lib/currency'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { additionalCapitalGainsTax, netTaxForLegs, type RealisedByCharacter, type TaxedLeg } from '@/lib/capital-gains'
import { taxRateFor } from '@/features/portfolios/tax/shared'

/**
 * §1222 nets within one taxpayer's return and never across two. Which accounts share a return:
 * - A tax-deferred or tax-free account is on none — its results are not recognised currently.
 * - An irrevocable trust, an entity and a custodial (UGMA/UTMA) account are each their own
 *   taxpayer, so each is its own return.
 * - An individual, joint or revocable-trust (grantor trust, §671) account is on its owner's
 *   return, which the owner's spouse shares only when the household records
 *   `married_filing_jointly`. Nothing assumes a joint return the firm has not recorded.
 */
const SEPARATE_TAXPAYER_TYPES: ReadonlySet<Account['type']> = new Set(['trust_irrevocable', 'entity', 'ugma_utma'])

export function taxReturnFor(account: Account): string | null {
  if (!isTaxableAccount(account.taxTreatment)) return null
  if (SEPARATE_TAXPAYER_TYPES.has(account.type)) return `account:${account.id}`
  const household = householdFixtures.find((h) => h.id === account.householdId)
  const owner = household?.members.find((m) => m.clientId === account.clientId)
  const filesJointly = household?.filingStatus === 'married_filing_jointly'
    && (owner?.relationship === 'primary' || owner?.relationship === 'spouse')
  return filesJointly ? `joint:${household.id}` : `client:${account.clientId}`
}

const NOTHING: RealisedByCharacter = { shortTerm: 0, longTerm: 0 }

const currencyOf = (account: Account): CurrencyCode => account.baseCurrency ?? 'USD'
const toUSD = (amount: number, from: CurrencyCode) => convertCurrency(amount, from, 'USD', FX_RATES_USD_BASE)

/** Realised results on `returnId` from 1 January of `asOfISO`'s year through `asOfISO`, in USD. */
export function ytdRealisedOnReturn(returnId: string, asOfISO: string): RealisedByCharacter {
  const yearStart = `${asOfISO.slice(0, 4)}-01-01`
  return realisedSales.reduce((total, sale) => {
    const account = accounts.find((a) => a.id === sale.accountId)
    if (!account) throw new Error(`realised sale ${sale.id} names unknown account ${sale.accountId}`)
    if (sale.saleDate < yearStart || sale.saleDate > asOfISO || taxReturnFor(account) !== returnId) return total
    const usd = toUSD(sale.realisedGainLoss, currencyOf(account))
    return sale.holdingPeriod === 'short'
      ? { ...total, shortTerm: total.shortTerm + usd }
      : { ...total, longTerm: total.longTerm + usd }
  }, NOTHING)
}

export type ReturnTaxEstimate = {
  /** The tax this account's legs add to its return, in the account's currency. */
  net: number
  /** The legs' own tax on gains, nothing netted. */
  gross: number
  /** Year-to-date realised results on the account's return, in the account's currency; `null` when it is on none. */
  ytdRealisedOnReturn: RealisedByCharacter | null
  /** Accounts earlier in the same batch, on the same return, whose legs this estimate nets against. */
  nettedWithAccountIds: string[]
}

/**
 * Estimate each account's proposal as the tax it adds to its return: netted against that return's
 * year-to-date realised results and against the legs of accounts **earlier in the same batch** on
 * the same return. Netting in batch order is what keeps a year-to-date loss from being spent once
 * per account — the estimates of one batch sum to the tax the whole batch adds to each return.
 *
 * Amounts are netted in USD (the realised-sales ledger's currency) and each estimate converted
 * back. An account with nothing to net against keeps `netTaxForLegs`' figure exactly, with no
 * FX round trip.
 */
export function estimateTaxOnReturns(
  batch: readonly { account: Account; legs: readonly TaxedLeg[] }[],
  asOfISO: string,
): ReturnTaxEstimate[] {
  const realisedSoFar = new Map<string, { realised: RealisedByCharacter; accountIds: string[] }>()
  return batch.map(({ account, legs }) => {
    const own = netTaxForLegs(legs, taxRateFor)
    const returnId = taxReturnFor(account)
    if (returnId === null) return { ...own, ytdRealisedOnReturn: null, nettedWithAccountIds: [] }

    const ytd = ytdRealisedOnReturn(returnId, asOfISO)
    const prior = realisedSoFar.get(returnId) ?? { realised: ytd, accountIds: [] }
    const currency = currencyOf(account)
    const fromUSD = (usd: number) => convertCurrency(usd, 'USD', currency, FX_RATES_USD_BASE)
    const added: RealisedByCharacter = {
      shortTerm: toUSD(legs.reduce((s, l) => s + l.realisedShortTerm, 0), currency),
      longTerm: toUSD(legs.reduce((s, l) => s + l.realisedLongTerm, 0), currency),
    }
    realisedSoFar.set(returnId, {
      realised: { shortTerm: prior.realised.shortTerm + added.shortTerm, longTerm: prior.realised.longTerm + added.longTerm },
      accountIds: [...prior.accountIds, account.id],
    })

    const nothingToNet = prior.realised.shortTerm === 0 && prior.realised.longTerm === 0
    return {
      net: nothingToNet ? own.net : Math.round(fromUSD(additionalCapitalGainsTax(prior.realised, added, taxRateFor))),
      gross: own.gross,
      ytdRealisedOnReturn: { shortTerm: Math.round(fromUSD(ytd.shortTerm)), longTerm: Math.round(fromUSD(ytd.longTerm)) },
      nettedWithAccountIds: prior.accountIds,
    }
  })
}
