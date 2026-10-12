import type { Figure } from '@/types/workspace'
import type { AssetClass } from '@/types/portfolio'
import type { ProposedTrade } from '@/services/oms'
import type { Proposal, ProposalVersion } from '@/types/workspace-proposal'
import type { Account } from '@/types/account'
import { accounts } from '@/mocks/data/accounts'
import { householdFixtures } from '@/mocks/data/households'
import { washSaleWindow } from '@/mocks/data/realised-sales'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { sameWashSaleTaxpayer, taxReturnFor, washSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { taxpayerHeldAway } from './harvest-scanner'
import { canHoldSecurities } from '@/lib/held-away'
import { firstNameOf, joinWords } from '@/lib/words'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { capitalLossUse, ORDINARY_INCOME_OFFSET_LIMIT, ORDINARY_INCOME_OFFSET_LIMIT_SEPARATE, recognisedResult } from '@/lib/capital-gains'
import { isSubjectToWashSale } from '@/lib/security-master'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { clientDate, clientMoney, clientPercent } from '@/kit/measure'

export type ClientLetter = { body: string; figures: Figure[] }

/** Asset classes as a client reads them. */
const CLIENT_WORDS: Readonly<Record<AssetClass, string>> = {
  us_equity: 'US stocks', intl_equity: 'international stocks', emerging_markets: 'emerging-market stocks', fixed_income: 'bonds',
  alternatives: 'alternative strategies', real_estate: 'real estate', commodities: 'commodities', cash: 'cash',
  digital_assets: 'digital-asset funds', private_equity: 'private equity',
}

const capitalise = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const dayAfter = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
const security = (t: Pick<ProposedTrade, 'name' | 'symbol'>) => `${t.name} (${t.symbol})`
/** A leg's result this year: realised less any §1091-washed part, both characters (collectibles are within long-term). */
const recognised = (t: ProposedTrade) => {
  const { shortTerm, longTerm } = recognisedResult(t)
  return shortTerm + longTerm
}
/** Client copy states dollars to the nearest hundred; `figures` keep the exact values. */
const aboutMoney = (v: number) => clientMoney(Math.round(v / 100) * 100)
const clientFirstName = (clientId: string) => {
  const named = clients.find((c) => c.id === clientId)
  return named ? firstNameOf(named.fullName) : undefined
}

/**
 * The client's message about an approved version, in plain language. Every figure is the version's
 * (or the drift that prompted it), formatted only by the kit's client formatters, and recorded in
 * `figures` beside the text.
 */
export function writeClientLetter(proposal: Proposal, version: ProposalVersion, signedBy: string): ClientLetter {
  const account = accounts.find((a) => a.id === proposal.accountId)
  const client = clients.find((c) => c.id === proposal.clientId)
  const signer = personById(signedBy)
  if (!account || !client || !signer) throw new Error(`Client Letter Agent: cannot address ${proposal.id}`)
  const drift = computeDriftForAccount(account)
  const worst = drift.assetClassDrifts.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a))
  const trades = version.preview.trades
  const sells = trades.filter((t) => t.side === 'sell')
  const buys = trades.filter((t) => t.side === 'buy')
  const figures: Figure[] = [
    { label: `${capitalise(CLIENT_WORDS[worst.assetClass])} before the rebalance`, value: worst.actual, unit: '%', source: 'drift.assetClassDrifts.actual' },
    { label: `${capitalise(CLIENT_WORDS[worst.assetClass])} target`, value: worst.target, unit: '%', source: 'drift.assetClassDrifts.target' },
  ]
  const paragraphs = [
    `Dear ${client.firstName},`,
    opening(account.name, modelDisplayName(drift.modelId), version)
      + ` ${capitalise(CLIENT_WORDS[worst.assetClass])} had grown to ${clientPercent(worst.actual)} of the account against a ${clientPercent(worst.target)} target, `
      + `so we plan to ${harvestOnly(version) ? `sell only ${sells.length === 1 ? 'a holding' : 'holdings'} at a loss` : 'sell some holdings'} and add to the areas below their targets.`,
    [
      sells.length > 0 ? `We plan to sell ${joinWords(sells.map(security))}` : '',
      buys.length > 0 ? `${sells.length > 0 ? ', and to buy' : 'We plan to buy'} ${joinWords(buys.map(security))}` : '',
    ].join('') + '.',
  ]

  // The engine prices every version as of today, so a sale today is the one its legs' windows describe.
  const saleDate = MOCK_TODAY_ISO
  const window = washSaleWindow(saleDate)
  // Wash-sale scope is the taxpayer: a trust, entity or custodial account is its own; otherwise the client, their spouse, and their IRAs.
  const ownTaxpayer = washSaleTaxpayer(account).startsWith('account:')
  const isTrust = account.type === 'trust_irrevocable'
  const spouses = ownTaxpayer ? [] : [...new Set(sameWashSaleTaxpayer(account).map((a) => a.clientId))]
    .filter((id) => id !== client.id)
    .flatMap((id) => clientFirstName(id) ?? [])
  const where = isTrust ? "in any of the trust's accounts"
    : ownTaxpayer ? 'in this account'
      : spouses.length > 0 ? `in any of your accounts or ${joinWords(spouses.map((n) => `${n}'s`))}, including IRAs` : 'in any of your accounts, including IRAs'
  const buyers = isTrust ? 'the trust has' : ownTaxpayer ? 'this account has' : spouses.length > 0 ? `you or ${joinWords(spouses)} have` : 'you have'
  // §1091: a taxable buyback defers the loss into the new shares; a retirement-account buyback disallows it for good (Rev. Rul. 2008-5).
  const consequence = ownTaxpayer
    ? 'A purchase in that period would not forfeit the loss but would postpone it until the new shares are sold.'
    : 'A purchase in that period in a taxable account would not forfeit the loss but would postpone it until the new shares are sold; '
      + 'a purchase in a retirement account such as an IRA, Roth IRA, 401(k) or 403(b) would lose it permanently.'
  const harvested = sells.filter((t) => t.repurchaseBlockedUntil !== undefined && isSubjectToWashSale(t.symbol) && recognised(t) < 0)
  for (const t of harvested) {
    const until = t.repurchaseBlockedUntil ?? ''
    if (until !== window.end) throw new Error(`Client Letter Agent: ${t.symbol}'s repurchase date ${until} is not a sale on ${saleDate}`)
    figures.push({ label: `${t.symbol} loss`, value: recognised(t), unit: 'USD', source: `version.preview.trades.${t.symbol} realised, less any washed part` })
    paragraphs.push(
      `Selling ${security(t)} is expected to realize a loss of about ${aboutMoney(-recognised(t))} at today's prices, which can offset capital gains, now or in later years. `
      + `To avoid postponing or losing that loss, if the sale is made on ${clientDate(saleDate)}, please don't buy ${t.name} back ${where}, on or before ${clientDate(until)}. ${consequence} `
      + `If the sale is made then, from ${clientDate(dayAfter(until))} you may buy it again. `
      + `Please also tell us before the sale if ${buyers} bought ${t.name} in any account on or after ${clientDate(window.start)}, because that can affect the loss.`,
    )
  }
  if (harvested.length > 0) {
    const away = taxpayerHeldAway(account).filter(canHoldSecurities).map((h) => {
      const owner = h.clientId === client.id ? 'your' : `${clientFirstName(h.clientId) ?? 'your spouse'}'s`
      return `${owner} ${h.institutionName} ${h.accountType.split(' — ')[0] ?? h.accountType}`
    })
    const names = joinWords(harvested.map((t) => t.name))
    // No dividend data is held per security, so the reinvestment advice is conditional.
    paragraphs.push(
      'Two things can also count as buying it back: dividends set to reinvest automatically, '
      + `and purchases in accounts we do not manage${away.length > 0 ? `, such as ${joinWords(away)}` : ''}. `
      + `If any account reinvests dividends into ${names}, please turn that off until then, and check with us before buying ${names} in any account.`,
    )
  }

  if (version.preview.taxable) {
    figures.push({ label: 'Estimated tax on the return', value: version.preview.estimatedTaxImpact, unit: 'USD', source: 'version.preview.estimatedTaxImpact' })
    paragraphs.push(...returnParagraphs(account, version, figures))
  } else {
    paragraphs.push('This account is tax-advantaged, so these sales create no taxable gain or loss.')
  }
  paragraphs.push(RATE_DISCLOSURE)
  paragraphs.push('The orders are with our compliance team for review before any is placed.')
  paragraphs.push(signer.name)
  return { body: paragraphs.join('\n\n'), figures }
}

const harvestOnly = (version: ProposalVersion) => version.constraints.some((c) => c.kind === 'harvest_only')

/** What the approved version sets out to do, from its constraints: a harvest or a capped rebalance only moves toward the model. */
function opening(accountName: string, modelName: string, version: ProposalVersion): string {
  if (harvestOnly(version)) return `We plan to move your ${accountName} account toward its ${modelName} model.`
  if (version.constraints.some((c) => c.kind === 'cap_realised_gains')) {
    return `We plan to move your ${accountName} account toward its ${modelName} model while limiting the gains it realizes.`
  }
  return `We plan to rebalance your ${accountName} account to bring it back in line with its ${modelName} model.`
}

/** §1211(b)'s limit on the account's return: $1,500 when the household records spouses filing separately, $3,000 otherwise. */
function ordinaryIncomeLimit(account: Account): number {
  const household = householdFixtures.find((h) => h.id === account.householdId)
  return household?.filingStatus === 'married_filing_separately' ? ORDINARY_INCOME_OFFSET_LIMIT_SEPARATE : ORDINARY_INCOME_OFFSET_LIMIT
}

/**
 * The version's effect on this year's return. The estimate already nets against the year's realised results;
 * when it adds no tax, what becomes of any net capital loss is stated from `capitalLossUse`.
 */
function returnParagraphs(account: Account, version: ProposalVersion, figures: Figure[]): string[] {
  const { estimatedTaxImpact, ytdRealisedOnReturn, trades } = version.preview
  const yourReturn = `your ${taxReturnFor(account)?.startsWith('joint:') === true ? 'joint ' : ''}return for ${MOCK_TODAY_ISO.slice(0, 4)}`
  if (estimatedTaxImpact > 0) {
    return [`After netting against the gains and losses already realized this year, we estimate about ${aboutMoney(estimatedTaxImpact)} of federal capital-gains tax added to ${yourReturn}.`]
  }
  const saving = estimatedTaxImpact < 0
    ? ` We estimate they would reduce the federal tax on gains already realized this year by about ${aboutMoney(-estimatedTaxImpact)}.`
    : ''
  const lines = [`After netting against the gains and losses already realized this year, we expect no federal capital-gains tax from these sales on ${yourReturn}.${saving}`]
  if (ytdRealisedOnReturn === null) return lines
  const priorNet = ytdRealisedOnReturn.shortTerm + ytdRealisedOnReturn.longTerm
  const added = trades.reduce((s, t) => s + recognised(t), 0)
  const limit = ordinaryIncomeLimit(account)
  const { ordinaryIncomeOffset, carriedForward } = capitalLossUse(priorNet, added, limit)
  if (ordinaryIncomeOffset <= 0 && carriedForward <= 0) return lines
  figures.push(
    { label: 'Loss offsetting ordinary income', value: ordinaryIncomeOffset, unit: 'USD', source: 'capitalLossUse.ordinaryIncomeOffset' },
    { label: 'Loss carried forward', value: carriedForward, unit: 'USD', source: 'capitalLossUse.carriedForward' },
  )
  const year = MOCK_TODAY_ISO.slice(0, 4)
  const rule = `Up to ${clientMoney(limit)} of net capital loss can offset ordinary income each year`
  const use = ordinaryIncomeOffset <= 0
    ? `${rule}, and losses already realized this year use that limit, so about ${aboutMoney(carriedForward)} of this loss carries forward to later years.`
    : carriedForward <= 0
      ? `${rule}, so about ${aboutMoney(ordinaryIncomeOffset)} of this loss would offset ordinary income for ${year}.`
      : `${rule}, so about ${aboutMoney(ordinaryIncomeOffset)} of this loss would offset ordinary income for ${year} and the rest, about ${aboutMoney(carriedForward)}, carries forward to later years.`
  lines.push(`The sales would leave a net capital loss for the year. ${use}`)
  return lines
}
