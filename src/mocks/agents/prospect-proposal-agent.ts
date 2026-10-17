import type { ProspectConstraint, ProspectProposalVersion, ProspectRecord } from '@/types/workspace-prospect'
import { prospects } from '@/mocks/data/prospects'
import { riskQuestions } from '@/mocks/data/onboarding'
import { taxCharacterOf } from '@/lib/security-master'
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
    return `Documented a phased sale of ${claimNameOf(content.concentration.symbol, content.concentration.name)} over ${TRANCHE_WORDS[staged.tranches]} tax years, to decide with her CPA; nothing sold.`
  }
  return 'Removed the phased sale; everything transferred in kind, nothing sold.'
}

/** Moved in kind, where she would stand against the model: the sleeve furthest over its target, and that reaching the model takes sales. */
export function inKindVsModelLine(c: ProspectVersionContent, voice: 'you' | 'she'): string {
  const widest = [...c.sleeves].sort((a, b) => (b.transferred - b.target) - (a.transferred - a.target))[0]
  if (!widest) throw new Error('A proposal has no sleeves to compare with its model')
  const label = CLIENT_ASSET_CLASS_WORDS[widest.assetClass]
  const concentrated = c.concentration && c.transfer.some((l) => l.symbol === c.concentration?.symbol && l.assetClass === widest.assetClass)
  const including = concentrated && c.concentration ? ` (including ${c.concentration.name})` : ''
  const holder = voice === 'you' ? 'the account you move to us' : 'the account she moves to us'
  const whose = voice === 'you' ? 'your' : 'her'
  return `Moved in kind, about ${clientWholePercent(widest.transferred)} of ${holder} would be in ${label}${including}, against ${clientWholePercent(widest.target)} in the ${c.modelName} model. Reaching the model would take sales, each a tax decision to make with ${whose} CPA.`
}

const HORIZON_QUESTION = 'rq-01'
const GOAL_QUESTION = 'rq-03'

/** Her answer to one question, as the questionnaire words it, for a sentence ("Maximize long-term growth" → "maximize long-term growth"). */
function answerWords(record: ProspectRecord, questionId: string): string {
  const answer = record.questionnaire?.answers.find((a) => a.questionId === questionId)
  const label = answer && riskQuestions.find((q) => q.id === questionId)?.options[answer.selectedOption]?.label
  if (!label) throw new Error(`Prospect ${record.id} has no answer to ${questionId}`)
  return `${label.charAt(0).toLowerCase()}${label.slice(1)}`
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
    return `${head}, about ${clientWholePercent(c.concentration.weightOfAssets)} of your total assets across both accounts. Selling it now would realize a ${term} gain of about ${aboutMoney(l.unrealized)}, with an estimated federal tax of about ${aboutMoney(l.taxIfSoldNow)} (an estimate; please check with your tax professional).`
  })
  const staged = c.tranches.length > 0 && c.concentration ? [
    '',
    `One option to decide with your CPA: selling ${c.concentration.name} in ${TRANCHE_WORDS[c.tranches.length === 3 ? 3 : 2]} parts, one in each tax year:`,
    ...c.tranches.map((t) => `- ${t.taxYear}: ${fmtQuantity(t.shares)} shares, a gain of about ${aboutMoney(t.gain)}, an estimated federal tax of about ${aboutMoney(t.tax)}${t.n > 1 ? " at today's rates" : ''}.`),
    `Figures are at the ${fmtDayMonthYear(c.pricesAsOf)} close; gains in later years depend on the price when sold (an estimate; please check with your tax professional). Nothing is sold unless you decide to.`,
  ] : []
  return [
    `Dear ${record.salutation},`,
    '',
    `Thank you for your questionnaire and your statements. You told us your goal is to ${answerWords(record, GOAL_QUESTION)} over a horizon of ${answerWords(record, HORIZON_QUESTION)}`
      + `.${c.concentration ? ` Your statements show a large, low-basis ${c.concentration.name} position, and we want to address it with you.` : ''}`,
    '',
    `We recommend our ${c.modelName} model, the one your answers point to: about ${clientWholePercent(mix.stocks)} in stocks and ${clientWholePercent(1 - mix.stocks)} in bonds, alternatives, commodities and cash.`,
    'Account: one individual taxable account in your name.',
    '',
    `Moving your ${custodian} account: everything moves in kind; nothing is sold to make the move.`,
    ...holdings,
    `- Cash: ${clientMoney(c.cash)}.`,
    '',
    inKindVsModelLine(c, 'you'),
    ...staged,
    '',
    ...c.heldAway.map((h) => `You asked about moving your ${h.custodian} 403(b). We'll compare the options and come back to you.`),
    '',
    `Fees: an estimated ${clientMoney(c.fees.annual)} a year on today's value of ${clientMoney(c.fees.base)} (a blended ${clientRate(c.fees.blendedRate)}), from our tiered schedule; the fee moves with the account's value.`,
    '',
    buildClientRateDisclosure(TAX_RATE_BASIS, { collectibles: c.transfer.some((l) => taxCharacterOf(l.symbol) === 'collectible') }),
    `Prices as of ${fmtDayMonthYear(c.pricesAsOf)} close.`,
    '',
    advisor,
    FIRM_NAME,
  ].join('\n')
}
