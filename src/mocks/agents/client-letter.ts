import type { Figure } from '@/types/workspace'
import type { AssetClass } from '@/types/portfolio'
import type { ProposedTrade } from '@/services/oms'
import type { Proposal, ProposalVersion } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { sameWashSaleTaxpayer, taxReturnFor, washSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { canHoldSecurities, taxpayerHeldAway } from './harvest-scanner'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { taxEstimateDirection } from '@/lib/capital-gains'
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

const ACCOUNT_WORDS: Readonly<Partial<Record<string, string>>> = { individual: 'individual account', joint: 'joint account' }

const joinWords = (words: readonly string[]): string =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
const capitalise = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const dayAfter = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
const security = (t: Pick<ProposedTrade, 'name' | 'symbol'>) => `${t.name} (${t.symbol})`
const recognised = (t: ProposedTrade) => t.realisedShortTerm + t.realisedLongTerm - ((t.washedLoss?.shortTerm ?? 0) + (t.washedLoss?.longTerm ?? 0))
const firstNameOf = (clientId: string) => clients.find((c) => c.id === clientId)?.firstName

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
  const accountWords = ACCOUNT_WORDS[account.type] ?? `account ${account.name}`
  const paragraphs = [
    `Dear ${client.firstName},`,
    `We have approved a rebalance of your ${accountWords} to bring it back in line with its ${modelDisplayName(drift.modelId)} model. `
      + `${capitalise(CLIENT_WORDS[worst.assetClass])} had grown to ${clientPercent(worst.actual)} of the account against a ${clientPercent(worst.target)} target, `
      + 'so we are selling some holdings and adding to the areas below their targets.',
    [
      sells.length > 0 ? `We are selling ${joinWords(sells.map(security))}` : '',
      buys.length > 0 ? `${sells.length > 0 ? ', and buying' : 'We are buying'} ${joinWords(buys.map(security))}` : '',
    ].join('') + '.',
  ]

  // Wash-sale scope is the taxpayer: a trust, entity or custodial account is its own; otherwise the client, their spouse, and their IRAs.
  const ownTaxpayer = washSaleTaxpayer(account).startsWith('account:')
  const spouses = ownTaxpayer ? [] : [...new Set(sameWashSaleTaxpayer(account).map((a) => a.clientId))]
    .filter((id) => id !== client.id)
    .flatMap((id) => firstNameOf(id) ?? [])
  const where = ownTaxpayer ? 'in this account' : spouses.length > 0 ? `in any of your accounts or ${joinWords(spouses.map((n) => `${n}'s`))}, including IRAs` : 'in any of your accounts, including IRAs'
  // §1091: a taxable buyback defers the loss into the new shares; an IRA or Roth buyback disallows it for good (Rev. Rul. 2008-5).
  const consequence = ownTaxpayer
    ? 'A purchase in that period would not forfeit the loss but would postpone it until the new shares are sold.'
    : 'A purchase in that period in a taxable account would not forfeit the loss but would postpone it until the new shares are sold; a purchase in an IRA or Roth IRA would lose it permanently.'
  const harvested = sells.filter((t) => t.repurchaseBlockedUntil !== undefined && isSubjectToWashSale(t.symbol) && recognised(t) < 0)
  for (const t of harvested) {
    const until = t.repurchaseBlockedUntil ?? ''
    figures.push({ label: `${t.symbol} loss`, value: recognised(t), unit: 'USD', source: `version.preview.trades.${t.symbol} realised, less any washed part` })
    paragraphs.push(
      `Selling ${security(t)} realises a loss of ${clientMoney(-recognised(t))}, which can offset gains on your tax return. `
      + `To use that loss now, please do not buy ${t.name} back ${where}, on or before ${clientDate(until)}. ${consequence} `
      + `From ${clientDate(dayAfter(until))} you may buy it again.`,
    )
  }
  if (harvested.length > 0) {
    const away = taxpayerHeldAway(account).filter(canHoldSecurities).map((h) => {
      const owner = h.clientId === client.id ? 'your' : `${firstNameOf(h.clientId) ?? 'your spouse'}'s`
      return `${owner} ${h.institutionName} ${h.accountType.split(' — ')[0] ?? h.accountType}`
    })
    paragraphs.push(
      'Two things can also count as buying it back: dividends set to reinvest automatically, '
      + `and purchases in accounts we do not manage${away.length > 0 ? `, such as ${joinWords(away)}` : ''}. `
      + `Please turn off dividend reinvestment on ${joinWords(harvested.map((t) => t.name))} until then, and check with us before buying it in any account.`,
    )
  }

  if (version.preview.taxable) {
    const { direction, amount } = taxEstimateDirection(version.preview.estimatedTaxImpact)
    figures.push({ label: 'Estimated tax on the return', value: version.preview.estimatedTaxImpact, unit: 'USD', source: 'version.preview.estimatedTaxImpact' })
    const joint = taxReturnFor(account)?.startsWith('joint:') === true
    paragraphs.push(`After netting against the gains and losses already realised this year, we estimate about ${clientMoney(amount)} of federal capital-gains tax ${direction} your ${joint ? 'joint ' : ''}return for ${MOCK_TODAY_ISO.slice(0, 4)}.`)
  } else {
    paragraphs.push('This account is tax-advantaged, so these sales create no taxable gain or loss.')
  }
  paragraphs.push(RATE_DISCLOSURE)
  paragraphs.push('The orders are with our compliance team for review before any is placed.')
  paragraphs.push(signer.name)
  return { body: paragraphs.join('\n\n'), figures }
}
