import type { ProspectConstraint, ProspectProposalVersion, ProspectRecord } from '@/types/workspace-prospect'
import { prospects } from '@/mocks/data/prospects'
import { modelMix } from '@/mocks/workspace/prospect-model'
import { FIRM_NAME } from '@/lib/firm'
import { TAX_RATE_BASIS, buildClientRateDisclosure } from '@/lib/tax-rules'
import { CLIENT_ASSET_CLASS_WORDS } from '@/lib/labels'
import { clientMoney, clientRate, clientWholePercent, fmtDayMonthYear, fmtQuantity } from '@/kit/measure'
import { claimNameOf } from './claim-name'

export type ProspectVersionContent = Omit<ProspectProposalVersion, 'n' | 'author' | 'createdAt' | 'changeSummary' | 'clientSummary' | 'fingerprint'>

const TRANCHE_WORDS: Readonly<Record<2 | 3, string>> = { 2: 'two', 3: 'three' }
/** Client copy states estimates to the nearest hundred dollars, as the client letter does. */
const aboutMoney = (v: number) => clientMoney(Math.round(v / 100) * 100)
const lastNameOf = (fullName: string) => fullName.split(' ').pop() ?? fullName

export const prospectProposalTitle = (record: ProspectRecord): string => `${lastNameOf(record.name)} proposal`

export function prospectDraftSummary(content: ProspectVersionContent): string {
  return `Drafted from her questionnaire's model, ${content.modelName}: one individual taxable account, everything transferred in kind, nothing sold.`
}

export function prospectChangeSummary(constraints: readonly ProspectConstraint[], content: ProspectVersionContent): string {
  const staged = constraints.find((c) => c.kind === 'stage_diversification')
  if (staged && content.concentration) {
    return `Documented a staged sale of ${claimNameOf(content.concentration.symbol, content.concentration.name)} over ${TRANCHE_WORDS[staged.tranches]} tax years, to decide with her CPA; nothing sold.`
  }
  return 'Removed the staged sale; everything transferred in kind, nothing sold.'
}

/** Moved in kind, where she would stand against the model: the sleeve furthest over its target, and that reaching the model takes sales. */
export function inKindVsModelLine(c: ProspectVersionContent, voice: 'you' | 'she'): string {
  const widest = [...c.sleeves].sort((a, b) => (b.transferred - b.target) - (a.transferred - a.target))[0]
  if (!widest) throw new Error('A proposal has no sleeves to compare with its model')
  const label = CLIENT_ASSET_CLASS_WORDS[widest.assetClass]
  const concentrated = c.concentration && c.transfer.some((l) => l.symbol === c.concentration?.symbol && l.assetClass === widest.assetClass)
  const including = concentrated && c.concentration ? ` (including ${c.concentration.name})` : ''
  const [who, whose] = voice === 'you' ? ['you', 'your'] : ['she', 'her']
  return `Moved in kind, ${who} would hold about ${clientWholePercent(widest.transferred)} in ${label}${including}, against ${clientWholePercent(widest.target)} in the ${c.modelName} model. Reaching the model would take sales, each a tax decision to make with ${whose} CPA.`
}

/** What she reads when the approved version is sent: the firm's plain language, each figure the version's, formatted for a client. */
export function clientSummaryOf(record: ProspectRecord, c: ProspectVersionContent): string {
  const advisor = prospects.find((p) => p.id === record.id)?.assignedAdvisor
  if (!advisor) throw new Error(`Prospect ${record.id} has no assigned advisor`)
  const custodian = record.statements.find((s) => s.accountType === 'taxable_brokerage')?.custodian
  if (!custodian) throw new Error(`Prospect ${record.id} has no taxable statement`)
  const mix = modelMix(c.modelId)
  const holdings = c.transfer.map((l) => {
    const head = `- ${l.name} (${l.symbol}): ${fmtQuantity(l.quantity)} shares, ${clientMoney(l.marketValue)}`
    if (c.concentration?.symbol !== l.symbol) return `${head}.`
    const term = l.holdingPeriod === 'long' ? 'long-term' : 'short-term'
    return `${head}, about ${clientWholePercent(c.concentration.weightOfAssets)} of your assets. Selling it now would realize a ${term} gain of about ${aboutMoney(l.unrealised)}, with an estimated federal tax of about ${aboutMoney(l.taxIfSoldNow)} (estimate; consult your tax professional).`
  })
  const staged = c.tranches.length > 0 && c.concentration ? [
    '',
    `One option to decide with your CPA: selling ${c.concentration.name} in ${TRANCHE_WORDS[c.tranches.length === 3 ? 3 : 2]} parts, one in each tax year:`,
    ...c.tranches.map((t) => `- ${t.taxYear}: ${fmtQuantity(t.shares)} shares, a gain of about ${aboutMoney(t.gain)}, an estimated federal tax of about ${aboutMoney(t.tax)}.`),
    `Figures are at the ${fmtDayMonthYear(c.pricesAsOf)} close; gains in later years depend on the price when sold (estimate; consult your tax professional). Nothing is sold unless you decide to.`,
  ] : []
  return [
    `Dear ${record.salutation},`,
    '',
    'Thank you for your questionnaire and your statements. This is our proposal.',
    '',
    `Portfolio: ${c.modelName}, our model for your answers: about ${clientWholePercent(mix.stocks)} in stocks and ${clientWholePercent(1 - mix.stocks)} in bonds, alternatives, commodities and cash.`,
    'Account: one individual taxable account in your name.',
    '',
    `Moving your ${custodian} account: everything moves in kind; nothing is sold to make the move.`,
    ...holdings,
    `- Cash: ${clientMoney(c.cash)}.`,
    '',
    inKindVsModelLine(c, 'you'),
    ...staged,
    '',
    ...c.heldAway.map((h) => `Your ${h.custodian} 403(b): a rollover was asked about; comparison to follow.`),
    '',
    `Fees: an estimated ${clientMoney(c.fees.annual)} a year on today's value of ${clientMoney(c.fees.base)} (a blended ${clientRate(c.fees.blendedRate)}), from our tiered schedule; the fee moves with the account's value.`,
    '',
    buildClientRateDisclosure(TAX_RATE_BASIS),
    `Prices as of ${fmtDayMonthYear(c.pricesAsOf)} close.`,
    '',
    advisor,
    FIRM_NAME,
  ].join('\n')
}
