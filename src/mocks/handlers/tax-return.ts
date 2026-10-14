import type { Account } from '@/types/account'
import type { CurrencyCode } from '@/types/currency'
import { accounts } from '../data/accounts'
import { householdFixtures } from '../data/households'
import { allRealizedSales, openWashSaleWindows, type OpenWashSaleWindow } from '../data/realized-sales'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { convertCurrency } from '@/lib/currency'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { additionalCapitalGainsTax, netTaxForLegs, recognisedResult, type RealizedByCharacter, type TaxedLeg } from '@/lib/capital-gains'
import { taxRateFor } from '@/lib/tax-rules'
import { taxCharacterOf } from '@/lib/security-master'

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

/**
 * §1091 asks whether *the taxpayer* bought replacement shares, which is a wider set than the
 * accounts on one return and a narrower one than the household:
 * - An irrevocable trust, an entity and a custodial account are their own taxpayers, so only their
 *   own purchases wash their own sales, and theirs wash no one else's.
 * - Everything else is its owner's, including the owner's IRAs and Roths (Rev. Rul. 2008-5).
 * - A spouse's purchase counts as the taxpayer's (IRS Pub. 550). Sources differ on spouses filing
 *   separately; treating a primary and a spouse as one wash-sale taxpayer either way is the
 *   conservative position, and the one taken here.
 * - Any other household member (an adult child, a parent) is a taxpayer of their own.
 */
export function washSaleTaxpayer(account: Account): string {
  if (SEPARATE_TAXPAYER_TYPES.has(account.type)) return `account:${account.id}`
  const household = householdFixtures.find((h) => h.id === account.householdId)
  const owner = household?.members.find((m) => m.clientId === account.clientId)
  const isCouple = household !== undefined && (owner?.relationship === 'primary' || owner?.relationship === 'spouse')
    && household.members.some((m) => m.relationship === 'spouse')
  return isCouple ? `couple:${household.id}` : `client:${account.clientId}`
}

/** The accounts whose purchases can wash a loss sold in `account`, and whose loss sales its purchases can wash. */
export function sameWashSaleTaxpayer(account: Account): Account[] {
  const taxpayer = washSaleTaxpayer(account)
  return accounts.filter((a) => a.householdId === account.householdId && washSaleTaxpayer(a) === taxpayer)
}

/** The open loss-sale windows that restrict buying in `account`: loss sales by the same wash-sale taxpayer. */
export function openWashSaleWindowsFor(account: Account, asOfISO: string): OpenWashSaleWindow[] {
  const taxpayer = washSaleTaxpayer(account)
  return openWashSaleWindows(asOfISO, account.householdId).filter((w) => {
    const seller = accounts.find((a) => a.id === w.accountId)
    if (!seller) throw new Error(`realized sale ${w.id} names unknown account ${w.accountId}`)
    return washSaleTaxpayer(seller) === taxpayer
  })
}

const NOTHING: Required<RealizedByCharacter> = { shortTerm: 0, longTerm: 0, collectibleLongTerm: 0 }

const currencyOf = (account: Account): CurrencyCode => account.baseCurrency ?? 'USD'
const toUSD = (amount: number, from: CurrencyCode) => convertCurrency(amount, from, 'USD', FX_RATES_USD_BASE)

/** Realized results on `returnId` from 1 January of `asOfISO`'s year through `asOfISO`, in USD. */
export function ytdRealizedOnReturn(returnId: string, asOfISO: string): Required<RealizedByCharacter> {
  const yearStart = `${asOfISO.slice(0, 4)}-01-01`
  return allRealizedSales().reduce((total, sale) => {
    const account = accounts.find((a) => a.id === sale.accountId)
    if (!account) throw new Error(`realized sale ${sale.id} names unknown account ${sale.accountId}`)
    if (sale.saleDate < yearStart || sale.saleDate > asOfISO || taxReturnFor(account) !== returnId) return total
    const usd = toUSD(sale.realizedGainLoss - (sale.washedLoss ?? 0), currencyOf(account))
    if (sale.holdingPeriod === 'short') return { ...total, shortTerm: total.shortTerm + usd }
    const collectible = taxCharacterOf(sale.symbol) === 'collectible' ? usd : 0
    return { ...total, longTerm: total.longTerm + usd, collectibleLongTerm: total.collectibleLongTerm + collectible }
  }, NOTHING)
}

export type ReturnTaxEstimate = {
  /** The tax this account's legs add to its return, in the account's currency. */
  net: number
  /** The legs' own tax on gains, nothing netted. */
  gross: number
  /** Year-to-date realized results on the account's return, in the account's currency; `null` when it is on none. */
  ytdRealizedOnReturn: Required<RealizedByCharacter> | null
  /** Accounts earlier in the same batch, on the same return, whose legs this estimate nets against. */
  nettedWithAccountIds: string[]
}

/**
 * Estimate each account's proposal as the tax it adds to its return: netted against that return's
 * year-to-date realized results and against the legs of accounts **earlier in the same batch** on
 * the same return. Netting in batch order is what keeps a year-to-date loss from being spent once
 * per account — the estimates of one batch sum to the tax the whole batch adds to each return.
 *
 * Amounts are netted in USD — each realized sale is converted from its account's currency, as
 * is each account's legs — and each estimate converted back into the account's currency. An account with nothing to net against keeps `netTaxForLegs`' figure exactly, with no
 * FX round trip.
 */
export function estimateTaxOnReturns(
  batch: readonly { account: Account; legs: readonly TaxedLeg[] }[],
  asOfISO: string,
): ReturnTaxEstimate[] {
  const realizedSoFar = new Map<string, { realized: Required<RealizedByCharacter>; accountIds: string[] }>()
  return batch.map(({ account, legs }) => {
    const own = netTaxForLegs(legs, taxRateFor)
    const returnId = taxReturnFor(account)
    if (returnId === null) return { ...own, ytdRealizedOnReturn: null, nettedWithAccountIds: [] }

    const ytd = ytdRealizedOnReturn(returnId, asOfISO)
    const prior = realizedSoFar.get(returnId) ?? { realized: ytd, accountIds: [] }
    const currency = currencyOf(account)
    const fromUSD = (usd: number) => convertCurrency(usd, 'USD', currency, FX_RATES_USD_BASE)
    // §1091 · only the recognised part of a loss offsets anything; a washed loss is not netted.
    const recognised = legs.map(recognisedResult)
    const added: Required<RealizedByCharacter> = {
      shortTerm: toUSD(recognised.reduce((s, r) => s + r.shortTerm, 0), currency),
      longTerm: toUSD(recognised.reduce((s, r) => s + r.longTerm, 0), currency),
      collectibleLongTerm: toUSD(recognised.reduce((s, r) => s + r.collectibleLongTerm, 0), currency),
    }
    realizedSoFar.set(returnId, {
      realized: {
        shortTerm: prior.realized.shortTerm + added.shortTerm,
        longTerm: prior.realized.longTerm + added.longTerm,
        collectibleLongTerm: prior.realized.collectibleLongTerm + added.collectibleLongTerm,
      },
      accountIds: [...prior.accountIds, account.id],
    })

    const nothingToNet = prior.realized.shortTerm === 0 && prior.realized.longTerm === 0 && prior.realized.collectibleLongTerm === 0
    return {
      net: nothingToNet ? own.net : Math.round(fromUSD(additionalCapitalGainsTax(prior.realized, added, taxRateFor))),
      gross: own.gross,
      ytdRealizedOnReturn: {
        shortTerm: Math.round(fromUSD(ytd.shortTerm)),
        longTerm: Math.round(fromUSD(ytd.longTerm)),
        collectibleLongTerm: Math.round(fromUSD(ytd.collectibleLongTerm)),
      },
      nettedWithAccountIds: prior.accountIds,
    }
  })
}
