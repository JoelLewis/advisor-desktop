import type { AgentContext } from './agent'
import type { TopicFinding } from './brief-topic'
import type { Account } from '@/types/account'
import type { Position } from '@/types/portfolio'
import type { HeldAwayAsset } from '@/types/held-away'
import type { Figure } from '@/types/workspace'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { washSaleWindow } from '@/mocks/data/realized-sales'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { generateTaxLotsWithSaleRisk } from '@/mocks/handlers/custodian'
import { openWashSaleWindowsFor, sameWashSaleTaxpayer, washSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { isHarvestable, lossAllowedNow, lossDeferred, lossDisallowed } from '@/lib/tax-rules'
import { isSubjectToWashSale } from '@/lib/security-master'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { convertToBase } from '@/lib/currency'
import { canHoldSecurities } from '@/lib/held-away'
import { claimNameOf } from './claim-name'

export type PositionLosses = { allowed: number; deferred: number; disallowed: number }

/** What a sale today does to one position's loss (§1091), in words with no digits. */
export function harvestClaim(name: string, symbol: string, { deferred, disallowed }: PositionLosses): string {
  if (!isSubjectToWashSale(symbol)) return `${name} can be sold at a loss today; as a coin held directly it is outside the wash-sale rule.`
  if (deferred === 0 && disallowed === 0) return `${name} can be sold at a loss today, and nothing bought in the last thirty days would wash the loss.`
  const parts = [
    ...(deferred < 0 ? ['part of the loss would be deferred into the replacement shares'] : []),
    ...(disallowed < 0 ? [`${deferred < 0 ? 'part' : 'part of the loss'} would be permanently disallowed because the replacement was bought in an IRA or Roth`] : []),
  ]
  return `${name} can be sold at a loss today; ${parts.join(', and ')}.`
}

/** Held-away assets of the account's wash-sale taxpayer; none for a trust, entity or custodial account, which is its own taxpayer. */
export function taxpayerHeldAway(account: Account): HeldAwayAsset[] {
  if (washSaleTaxpayer(account).startsWith('account:')) return []
  const people = new Set(sameWashSaleTaxpayer(account).map((a) => a.clientId))
  return heldAwayAssets.filter((h) => people.has(h.clientId))
}

/** "401(k) — Former employer" → "401(k)". */
const shortAccountType = (accountType: string) => accountType.split(' — ')[0] ?? accountType

export type HarvestOpportunity = { position: Position; losses: PositionLosses }

/**
 * The positions in a taxable account that a sale today would harvest: a loss allowed now past the
 * harvest threshold, largest first. None in an account whose sales are not taxed.
 */
export function harvestOpportunities(account: Account): HarvestOpportunity[] {
  if (!isTaxableAccount(account.taxTreatment)) return []
  const currency = account.baseCurrency ?? 'USD'
  const lots = generateTaxLotsWithSaleRisk(account.id, account.totalValue)
  return getPositionsForAccount(account.id, account.totalValue)
    .filter((p) => p.symbol !== 'CASH')
    .map((p) => {
      const own = lots.filter((l) => l.positionId === p.id)
      const sum = (f: (l: (typeof own)[number]) => number) => own.reduce((s, l) => s + f(l), 0)
      return { position: p, losses: { allowed: sum(lossAllowedNow), deferred: sum(lossDeferred), disallowed: sum(lossDisallowed) } }
    })
    .filter(({ losses }) => isHarvestable(losses.allowed, currency, FX_RATES_USD_BASE))
    .sort((a, b) => a.losses.allowed - b.losses.allowed)
}

export function runHarvestScanner({ asOf, subject }: AgentContext): TopicFinding[] {
  if (subject.type !== 'account') return []
  const account = accounts.find((a) => a.id === subject.id)
  if (!account) return []
  const today = asOf.slice(0, 10)
  const lotsCite = [{ source: `Tax lots with wash-sale matching · ${account.name}`, asOf }]
  const findings: TopicFinding[] = []
  const openWindows = openWashSaleWindowsFor(account, today)
  // A position partly sold at a loss already: its claim says the rest can be sold, so the two findings agree.
  const partlySold = new Set(openWindows.map((w) => w.symbol))
  const harvestName = (symbol: string, name: string) =>
    partlySold.has(symbol) ? `The remaining ${claimNameOf(symbol, name)} shares` : claimNameOf(symbol, name)

  if (!isTaxableAccount(account.taxTreatment)) {
    findings.push({ claim: 'Sales in this account are not taxed, so there is no loss to harvest here.', attention: 'info', figures: [], citations: lotsCite, topic: { kind: 'not_measured' } })
  } else {
    const currency = account.baseCurrency ?? 'USD'
    const usd = (amount: number) => Math.round(convertToBase(amount, currency, FX_RATES_USD_BASE))
    const window = washSaleWindow(today)
    const harvestable = harvestOpportunities(account)
    if (harvestable.length === 0) {
      findings.push({ claim: 'No position in this account can be sold at a loss today.', attention: 'info', figures: [], citations: lotsCite, topic: { kind: 'not_measured' } })
    }
    for (const { position: p, losses } of harvestable) {
      const figures: Figure[] = [
        { label: `Loss allowed now · ${p.symbol}`, value: usd(losses.allowed), unit: 'USD', source: 'lossAllowedNow' },
        { label: `Washed · ${p.symbol}`, value: usd(losses.deferred + losses.disallowed), unit: 'USD', source: 'lossDeferred + lossDisallowed' },
        { label: `Shares · ${p.symbol}`, value: p.quantity, unit: 'sh', source: 'positions.quantity' },
      ]
      const citations = isSubjectToWashSale(p.symbol)
        ? [...lotsCite, { source: `Wash-sale window · a sale of ${p.symbol} on ${today} restricts buying it back through ${window.end}`, asOf }]
        : lotsCite
      findings.push({
        claim: harvestClaim(harvestName(p.symbol, p.name), p.symbol, losses), attention: 'attention', figures, citations,
        topic: { kind: 'harvest_allowed', symbol: p.symbol, name: claimNameOf(p.symbol, p.name), remaining: partlySold.has(p.symbol) },
      })
    }
  }

  for (const w of openWindows) {
    findings.push({
      claim: `${claimNameOf(w.symbol, w.name)} was sold at a loss ${w.saleDate === today ? 'today' : 'recently'}; buying it back in any account of the same taxpayer, IRAs and Roths included, would wash that loss until its window closes.`,
      attention: 'info',
      topic: { kind: 'realized_loss', symbol: w.symbol, name: claimNameOf(w.symbol, w.name), when: w.saleDate === today ? 'today' : 'recently' },
      figures: [
        { label: `Loss realized · ${w.symbol}`, value: w.realizedGainLoss, unit: 'USD', source: 'realizedSales.realizedGainLoss' },
        { label: `Days until the ${w.symbol} window closes`, value: w.daysRemaining, unit: 'd', source: 'openWashSaleWindows.daysRemaining' },
      ],
      citations: [{ source: `Wash-sale window · ${w.id} · ${w.symbol} loss sale of ${w.saleDate}, open through ${w.end}`, asOf }],
    })
  }

  const away = taxpayerHeldAway(account).filter(canHoldSecurities)
  if (away.length > 0) {
    findings.push({
      claim: 'Held-away accounts are not visible to wash-sale checks; a purchase in one can still wash a loss.',
      attention: 'info',
      topic: { kind: 'held_away' },
      figures: away.map((h) => ({ label: `Held away · ${h.institutionName} ${shortAccountType(h.accountType)}`, value: h.estimatedValue, unit: 'USD' as const, source: 'heldAwayAssets.estimatedValue' })),
      citations: away.map((h) => ({ source: `Held-away assets · ${h.institutionName} · as reported by the client`, asOf: h.lastUpdated })),
    })
  }
  return findings
}
