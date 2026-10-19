import type { AgentId, Figure, Message, Subject } from '@/types/workspace'
import type { ProposalViolation } from '@/services/oms'
import type { Holding } from '@/types/workspace-prospect'
import { sessionNow, store } from '@/mocks/data/workspace-store'
import { accounts } from '@/mocks/data/accounts'
import { householdFixtures } from '@/mocks/data/households'
import { briefToday } from '@/mocks/workspace/brief-today'
import { BRIEF_THREAD_ID } from '@/mocks/workspace/brief'
import { accountDisplayName } from '@/lib/account-display'
import { clientRiskOf } from '@/mocks/reference/risk'
import { REBALANCE_LINE } from '@/mocks/agents/meeting-notes'
import type { HouseholdLedger } from '@/mocks/workspace/household-ledger'
import { rebalanceStateOf } from '@/mocks/workspace/meeting-agents'
import { meetingDay } from '@/mocks/workspace/meetings'
import { clientDate, clientMoney, clientWholePercent, fmtQuantity } from '@/kit/measure'
import { ASSET_CLASS_LABELS, CLIENT_ASSET_CLASS_WORDS } from '@/lib/labels'
import { closeOf } from '@/mocks/workspace/transfer-in'
import { holdingPeriodOn } from '@/lib/holding-period'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { orders } from '@/mocks/handlers/oms'
import { isFirmViewer } from '@/mocks/workspace/visibility'

const isFirmAuthor = (id: string) => isFirmViewer(id)
import { easternDayOf } from '@/lib/eastern-day'
import { washSaleTaxpayer } from '@/mocks/handlers/tax-return'

const sameTaxpayer = (a: string, b: string) => {
  const [x, y] = [accounts.find((o) => o.id === a), accounts.find((o) => o.id === b)]
  if (!x || !y) throw new Error(`No account ${x ? b : a}`)
  return washSaleTaxpayer(x) === washSaleTaxpayer(y)
}

/** Where a claim was said: an agent's finding, a finding carried to another thread, a reference row taken to one, the Brief's summary or Today, a proposal version, a fills report, meeting notes or a client letter. */
type Source = 'finding' | 'carried' | 'reference' | 'summary' | 'today' | 'proposal' | 'pretrade' | 'fills' | 'notes' | 'letter'
/**
 * Something the product said about a household's book, with what it said it from. `householdId` is the household it
 * speaks of (none for a prospect's statements). `day` is the New York day the claim speaks of: the session's day when it
 * was made, except the meeting notes, which record the meeting's own day and are read against the ledger as the meeting
 * ended (`asOf`).
 */
export type Claim = {
  key: string; source: Source; householdId?: string; day: string; asOf?: string; agentId?: AgentId; accountId?: string; text: string; figures: Figure[]
  fillIds?: string[]
  /** A summary reading: the finding it reads, which must stand in the same Brief. */
  findingId?: string
  /** A Today line: the orders it says await compliance release. */
  awaiting?: { accountId: string; version: number }
  /** A proposal version's pre-trade note, as the engine judged it. */
  violation?: ProposalViolation
  /** A prospect's claim: whose statements it speaks of. */
  prospectId?: string
}
type Rule = { name: string; applies: (c: Claim) => boolean; disagrees: (c: Claim, ledger: HouseholdLedger) => string | undefined }

/**
 * Words that make a claim about trades, fills or holdings: a claim whose text or figure labels use one must be
 * checked by a rule.
 */
const TRADE_WORDS = /\b(?:fill(?:s|ed)?|bought|buy(?:s|ing)?|sold|sells?|selling|sales?|today|positions?|holds?|holding|shares|trade[sd]?|trading|executed|working orders?|rebalance[ds]?|awaiting compliance release|approved)\b/i

const symbolIn = (c: Claim, prefix: string): string => {
  const figure = c.figures.find((f) => f.label.startsWith(prefix))
  if (!figure) throw new Error(`"${c.text}" carries no "${prefix}" figure`)
  return figure.label.slice(prefix.length)
}
const accountOf = (c: Claim, ledger: HouseholdLedger) => {
  const found = ledger.accounts.find((a) => a.account.id === c.accountId)
  if (!found) throw new Error(`"${c.text}" names no account of ${ledger.householdId}`)
  return found
}
/** §1091 reads the taxpayer: a buy today in any of the household's accounts of the same taxpayer as `accountId`. */
const taxpayerBoughtToday = (ledger: HouseholdLedger, accountId: string | undefined, symbol: string) => {
  const own = accounts.find((a) => a.id === accountId)
  if (!own) throw new Error(`No account ${accountId ?? '(none)'}`)
  return ledger.fillsOnDay.some((f) => f.side === 'buy' && f.symbol === symbol && sameTaxpayer(own.id, f.accountId))
}
const boughtHere = (ledger: HouseholdLedger, accountId: string | undefined, symbol: string) =>
  ledger.fillsOnDay.some((f) => f.accountId === accountId && f.side === 'buy' && f.symbol === symbol)
const fail = (wrong: boolean, why: string) => (wrong ? why : undefined)

/** A rule for a claim that names no household: a prospect's statements on file, read without the firm's ledger. */
type UnanchoredRule = { name: string; applies: (c: Claim) => boolean; disagrees: (c: Claim) => string | undefined }
const statementsOf = (c: Claim) => {
  const record = store().prospects.find((p) => p.id === c.prospectId)
  if (!record) throw new Error(`${c.source} ${c.key} names no prospect`)
  return record.statements
}
const taxableOf = (c: Claim) => {
  const taxable = statementsOf(c).find((st) => st.accountType === 'taxable_brokerage')
  if (!taxable) throw new Error(`${c.prospectId ?? '?'} shared no taxable statement`)
  return taxable
}
const valueOf = (h: Holding) => h.quantity * closeOf(h.symbol).price
const holdingNamed = (c: Claim, symbol: string) => statementsOf(c).flatMap((st) => st.holdings).find((h) => h.symbol === symbol)
/** Her taxable statement's value at the close: what she would move to the firm. */
const taxableValue = (c: Claim) => { const t = taxableOf(c); return t.holdings.reduce((v, h) => v + valueOf(h), 0) + t.cash }
const longTermGain = (h: Holding) => valueOf(h) > h.costBasis && holdingPeriodOn(h.acquired, MOCK_TODAY_ISO) === 'long'

const UNANCHORED_RULES: readonly UnanchoredRule[] = [
  { name: 'prospect: a holding moves in kind', applies: (c) => c.agentId === 'transfer-in' && /^(?:.+) (?:is a concentrated position; it )?can move in kind/.test(c.text),
    disagrees: (c) => {
      const value = c.figures.find((f) => f.label === 'Market value')?.value
      const h = statementsOf(c).flatMap((st) => st.holdings).find((x) => Math.abs(valueOf(x) - (value ?? Number.NaN)) < 0.01)
      return fail(!h || (/long-term gain/.test(c.text) && !longTermGain(h)), 'Transfer-In speaks of a holding, or a long-term gain, her statements do not show')
    } },
  { name: 'prospect letter: a holding on her statement', applies: (c) => c.source === 'letter' && /^- .+ \((\S+)\): [\d,.]+ shares, \$/.test(c.text),
    disagrees: (c) => {
      const [, symbol = '', quantity = ''] = /\((\S+)\): ([\d,.]+) shares/.exec(c.text) ?? []
      const h = holdingNamed(c, symbol)
      return fail(!h || fmtQuantity(h.quantity) !== quantity || (/long-term gain/.test(c.text) && !longTermGain(h)), `the letter states ${quantity} ${symbol}; her statements disagree`)
    } },
  { name: 'prospect letter: a sale in parts', applies: (c) => c.source === 'letter' && /^- \d{4}: [\d,.]+ shares, a gain of about/.test(c.text),
    disagrees: (c) => {
      const shares = Number((/: ([\d,.]+) shares/.exec(c.text)?.[1] ?? '').replace(/,/g, ''))
      return fail(!statementsOf(c).flatMap((st) => st.holdings).some((h) => shares > 0 && shares <= h.quantity && valueOf(h) > h.costBasis), 'a tranche sells shares no holding at a gain has')
    } },
  { name: 'prospect letter: a sale in parts offered', applies: (c) => c.source === 'letter' && /^One option to decide with your CPA: selling (.+) in \w+ parts, one in each tax year:$/.test(c.text),
    disagrees: (c) => {
      const name = /selling (.+) in \w+ parts/.exec(c.text)?.[1]
      const h = statementsOf(c).flatMap((st) => st.holdings).find((x) => x.name === name)
      return fail(!h || valueOf(h) <= h.costBasis, `her statements show no ${name ?? '?'} position at a gain to sell in parts`)
    } },
  { name: 'prospect letter: the low-basis position', applies: (c) => c.source === 'letter' && /Your statements show a large, low-basis (.+) position/.test(c.text),
    disagrees: (c) => {
      const name = /low-basis (.+) position/.exec(c.text)?.[1]
      const h = statementsOf(c).flatMap((st) => st.holdings).find((x) => x.name === name)
      return fail(!h || h.costBasis >= valueOf(h) / 2, `her statements show no large, low-basis ${name ?? '?'} position`)
    } },
  { name: 'prospect letter: everything in kind', applies: (c) => c.source === 'letter' && /^Moving your (.+) account: everything moves in kind; nothing is sold/.test(c.text),
    disagrees: (c) => fail(taxableOf(c).custodian !== /^Moving your (.+) account/.exec(c.text)?.[1] || orders.some((o) => o.accountId === c.prospectId), 'the letter names another custodian, or an order exists for her') },
  { name: 'prospect letter: in kind against the model', applies: (c) => c.source === 'letter' && /^Moved in kind, about \S+ of the account you move to us would be in /.test(c.text),
    disagrees: (c) => {
      const [, pct = '', words = ''] = /about (\S+) of the account you move to us would be in ([^(,]+?)(?: \(|,)/.exec(c.text) ?? []
      const t = taxableOf(c)
      const inClass = t.holdings.filter((h) => CLIENT_ASSET_CLASS_WORDS[h.assetClass] === words).reduce((v, h) => v + valueOf(h), 0)
      return fail(clientWholePercent(inClass / taxableValue(c)) !== pct, `the letter says ${pct} in ${words}; her statement says ${clientWholePercent(inClass / taxableValue(c))}`)
    } },
  { name: "prospect letter: the fee on today's value", applies: (c) => c.source === 'letter' && /on today's value of (\$[\d,]+)/.test(c.text),
    disagrees: (c) => fail(clientMoney(taxableValue(c)) !== /on today's value of (\$[\d,]+)/.exec(c.text)?.[1], "the fee's base is not her statement's value") },
  { name: 'prospect letter: prices at the close', applies: (c) => c.source === 'letter' && /^Figures are at the (.+) close; .*Nothing is sold unless you decide to\.$/.test(c.text),
    disagrees: (c) => fail(!c.text.includes(`at the ${clientDate(MOCK_TODAY_ISO)} close`) || orders.some((o) => o.accountId === c.prospectId), 'the letter prices at another close, or something was sold for her') },
]

const SUMMARY_RULE = 'summary reads a standing finding'

const RULES: readonly Rule[] = [
  { name: 'harvest offered', applies: (c) => c.agentId === 'harvest-scanner' && /can be sold at a loss today/.test(c.text) && !/^No position/.test(c.text),
    disagrees: (c, l) => { const s = symbolIn(c, 'Loss allowed now · '); return fail(!accountOf(c, l).positions.some((p) => p.symbol === s) || taxpayerBoughtToday(l, c.accountId, s), `${s} offered for harvest but not held, or bought today by its taxpayer`) } },
  { name: 'realized loss', applies: (c) => /was sold at a loss (?:today|recently)/.test(c.text),
    disagrees: (c, l) => {
      const s = symbolIn(c, 'Loss realized · ')
      const today = /sold at a loss today/.test(c.text)
      return fail(!l.realizedSales.some((r) => r.symbol === s && r.realizedGainLoss < 0 && (today ? r.saleDate === l.day : r.saleDate < l.day)), `${s} realized loss ${today ? 'today' : 'recently'} not in the ledger`)
    } },
  { name: 'bought today', applies: (c) => /was bought today in this account/.test(c.text),
    disagrees: (c, l) => { const s = symbolIn(c, 'Bought today · '); return fail(!boughtHere(l, c.accountId, s), `${s} said bought today, no buy fill today`) } },
  { name: 'bought today by the taxpayer', applies: (c) => /was bought today in another account of the same taxpayer/.test(c.text),
    disagrees: (c, l) => {
      const s = symbolIn(c, 'Bought today · ')
      return fail(boughtHere(l, c.accountId, s) || !taxpayerBoughtToday(l, c.accountId, s), `${s} said bought today elsewhere by the taxpayer; the ledger disagrees`)
    } },
  { name: 'replacement held', applies: (c) => /was bought in place of the/.test(c.text),
    disagrees: (c, l) => {
      const figure = c.figures.find((f) => f.label.endsWith(' weight'))
      const s = figure?.label.replace(/ weight$/, '')
      return fail(s === undefined || !accountOf(c, l).positions.some((p) => p.symbol === s) || !l.realizedSales.some((r) => r.replacementSymbol === s), `replacement ${s ?? '?'} not held or not a replacement`)
    } },
  { name: 'suitability: model against tolerance', applies: (c) => /^(?:Warning: )?.+ sits above .+'s \S+(?: \S+)? tolerance for this account; after a full rebalance to the model, .+'s accounts as a whole would sit (?:within|above|below) it/.test(c.text),
    disagrees: (c, l) => {
      const owner = accountOf(c, l).account.clientId
      const risk = clientRiskOf(owner)
      const score = c.figures.find((f) => f.label.endsWith(' risk score'))?.value
      const ceiling = c.figures.find((f) => f.label.endsWith("'s tolerance ceiling"))?.value
      const after = c.figures.find((f) => f.label.endsWith("'s accounts as a whole, after a full rebalance to the model"))?.value
      const within = /would sit within it/.test(c.text)
      return fail(!risk || !c.text.includes(`'s ${risk.posture.tolerance.band} tolerance`) || score === undefined || ceiling === undefined || after === undefined || score <= ceiling || (within && after > ceiling),
        "the model, the client's tolerance and the accounts as a whole do not read as the claim says")
    } },
  { name: 'illiquid holding', applies: (c) => /^(.+) cannot be sold at market; it can only be reduced at the fund's periodic repurchase windows/.test(c.text),
    disagrees: (c, l) => {
      const name = /^(.+) cannot be sold at market/.exec(c.text)?.[1]
      return fail(!accountOf(c, l).positions.some((p) => ASSET_CLASS_LABELS[p.assetClass] === name), `${name ?? '?'} is not held in the account`)
    } },
  { name: 'held away named', applies: (c) => /^Held-away accounts are not visible to wash-sale checks|are held away: the firm does not manage them/.test(c.text),
    disagrees: (c, l) => {
      const named = c.figures.map((f) => f.label.replace(/^Held away · /, ''))
      return fail(named.length === 0 || named.some((label) => !l.heldAway.some((h) => label.startsWith(`${h.institutionName} `))), 'a held-away account the ledger does not hold')
    } },
  { name: 'harvest: none without a wash', applies: (c) => c.text === 'No loss in this account can be harvested today without a wash sale.',
    disagrees: (c, l) => fail(!accountOf(c, l).positions.some((p) => p.gainLoss < 0 && taxpayerBoughtToday(l, c.accountId, p.symbol)), 'no loss in the account was bought today by its taxpayer') },
  { name: 'concentration over today', applies: (c) => /^Warning: .+ is over its concentration limit today; the proposal brings it under\./.test(c.text),
    disagrees: (c, l) => {
      const limit = c.figures.find((f) => f.label.endsWith(' limit'))
      const after = c.figures.find((f) => f.label.endsWith(' after the proposal'))
      const symbol = limit?.label.replace(/ limit$/, '')
      const a = accountOf(c, l)
      const today = a.positions.filter((p) => p.symbol === symbol).reduce((v, p) => v + p.marketValue, 0) / a.account.totalValue
      return fail(!limit || !after || today <= limit.value || after.value > limit.value, `${symbol ?? '?'} is not over its limit today, or not under it after`)
    } },
  { name: 'Intel restriction', applies: (c) => (c.source === 'notes' || c.source === 'letter') && /^(?:Robert will not buy Intel in any of|- The Intel restriction covers all of your accounts)/.test(c.text),
    disagrees: (_, l) => fail(!l.washWindows.some((w) => w.symbol === 'INTC'), 'an Intel restriction with no open Intel wash-sale window') },
  { name: 'letter: met today', applies: (c) => c.source === 'letter' && /meeting with me today/.test(c.text),
    disagrees: (c) => fail(!store().meetings.some((m) => m.householdId === c.householdId && m.heldAt !== undefined && meetingDay(m) === c.day), 'the letter says the meeting was today; it was not') },
  { name: 'letter: met on a date', applies: (c) => c.source === 'letter' && /meeting with me on /.test(c.text),
    disagrees: (c) => fail(!store().meetings.some((m) => m.householdId === c.householdId && m.heldAt !== undefined && meetingDay(m) < c.day && c.text.includes(`meeting with me on ${clientDate(meetingDay(m))}.`)), 'the letter dates the meeting on a day it was not held') },
  { name: 'pre-trade: model above tolerance', applies: (c) => c.source === 'pretrade' && c.violation?.category === 'model_above_tolerance',
    disagrees: (c, l) => {
      const t = c.violation?.tolerance
      const risk = clientRiskOf(accountOf(c, l).account.clientId)
      return fail(!t || !risk || t.toleranceBand !== risk.posture.tolerance.band || t.wholeTodayScore !== risk.posture.score || t.modelScore <= t.ceiling,
        "the note's tolerance, or the accounts as a whole today, disagree with the Risk view")
    } },
  { name: 'pre-trade: working order overlap', applies: (c) => c.source === 'pretrade' && c.violation?.category === 'working_order',
    disagrees: (c, l) => {
      const w = c.violation?.workingOrder
      return fail(!w || !l.openOrders.some((o) => o.status === 'working' && o.symbol === w.symbol && o.side === w.side && o.quantity === w.quantity && o.accountId === c.accountId), `no working order on ${w?.symbol ?? '?'}`)
    } },
  { name: 'pre-trade: concentration today', applies: (c) => c.source === 'pretrade' && c.violation?.category === 'concentration_limit',
    disagrees: (c, l) => {
      const v = c.violation
      const a = accountOf(c, l)
      const held = a.positions.filter((p) => p.symbol === v?.symbol).reduce((s, p) => s + p.marketValue, 0)
      const working = a.openOrders.filter((o) => o.status === 'working' && o.symbol === v?.symbol).reduce((s, o) => s + (o.side === 'buy' ? o.estimatedValue : -o.estimatedValue), 0)
      const today = Math.max(0, held + working) / a.account.totalValue
      return fail(!v || v.limitWeight === undefined || v.preExisting !== today > v.limitWeight, `${v?.symbol ?? '?'}: the note and the ledger disagree on whether it is over its limit today`)
    } },
  { name: 'prep: nothing filled', applies: (c) => c.text === "No orders have been filled in the household's accounts today.",
    disagrees: (_, l) => fail(l.fillsOnDay.length > 0, 'Meeting Prep said nothing filled today; the ledger has fills') },
  { name: 'prep: filled', applies: (c) => /^Orders released today were filled in /.test(c.text),
    disagrees: (_, l) => fail(!l.fillsOnDay.some((f) => f.source.kind === 'proposal'), 'Meeting Prep said orders filled today; the ledger has none') },
  { name: 'prep: wash-sale windows', applies: (c) => c.agentId === 'meeting-prep' && /^The taxpayer has (?:open wash-sale windows|no open wash-sale window)/.test(c.text),
    disagrees: (c, l) => fail(/^The taxpayer has no open/.test(c.text) !== (l.washWindows.length === 0), 'Meeting Prep and the ledger disagree on the open wash-sale windows') },
  { name: 'working order overlap', applies: (c) => /already has a working order/.test(c.text),
    disagrees: (c, l) => { const s = symbolIn(c, 'Working order · '); return fail(!l.openOrders.some((o) => o.status === 'working' && o.symbol === s && o.accountId === c.accountId), `no working order on ${s}`) } },
  { name: 'proposal counts working orders', applies: (c) => c.source === 'proposal' && /counts the working orders? already open/.test(c.text),
    disagrees: (c, l) => fail(!l.openOrders.some((o) => o.status === 'working' && o.accountId === c.accountId), 'a proposal counted a working order the ledger does not have') },
  { name: 'notes: the rebalance', applies: (c) => c.source === 'notes' && Object.values(REBALANCE_LINE).includes(c.text),
    disagrees: (c, l) => fail(REBALANCE_LINE[rebalanceStateOf(l)] !== c.text, `the notes say "${c.text}"; the ledger says ${rebalanceStateOf(l)}`) },
  { name: "notes: Patricia's accounts", applies: (c) => c.source === 'notes' && /as a whole they sit (?:within|above|below) her /.test(c.text),
    disagrees: (c) => {
      const risk = clientRiskOf('cli-002')
      return fail(!risk || !c.text.includes(`sit ${risk.posture.status} her ${risk.posture.tolerance.band} tolerance`), "the notes and the Risk view disagree on Patricia's accounts")
    } },
  { name: 'letter: the Intel window', applies: (c) => c.source === 'letter' && /Intel shares in any of your accounts through /.test(c.text),
    disagrees: (c, l) => {
      const end = l.washWindows.filter((w) => w.symbol === 'INTC').map((w) => w.end).sort().pop()
      return fail(end === undefined || !c.text.includes(`through ${clientDate(end)}`), 'the letter states an Intel window the ledger does not')
    } },
  { name: "no trades in Patricia's accounts", applies: (c) => (c.source === 'letter' && /We won't trade in Patricia's accounts/.test(c.text)) || (c.source === 'notes' && /^No trades in Patricia's accounts until/.test(c.text)),
    disagrees: (_, l) => {
      const hers = new Set(accounts.filter((a) => a.clientId === 'cli-002').map((a) => a.id))
      return fail(l.openOrders.some((o) => hers.has(o.accountId)) || l.fillsOnDay.some((f) => hers.has(f.accountId)), "the record promises no trades in Patricia's accounts; the ledger has one")
    } },
  { name: SUMMARY_RULE, applies: (c) => c.source === 'summary',
    disagrees: (c) => fail(!store().messages.some((m) => m.kind === 'agent_finding' && m.threadId === BRIEF_THREAD_ID && m.id === c.findingId), `the summary reads ${c.findingId ?? '(none)'}, which is not a finding in the Brief`) },
  { name: 'today: awaiting release', applies: (c) => c.source === 'today' && c.awaiting !== undefined,
    disagrees: (c, l) => fail(!l.openOrders.some((o) => o.status === 'pending_compliance' && o.accountId === c.awaiting?.accountId && o.source.kind === 'proposal' && o.source.version === c.awaiting.version),
      'Today says orders await release; the ledger has none pending') },
  { name: 'fills report', applies: (c) => c.source === 'fills',
    disagrees: (c, l) => fail((c.fillIds ?? []).some((id) => !l.fillsOnDay.some((f) => f.id === id)), 'the fills report names a fill the ledger does not have today') },
]

/** The household a subject speaks of: an account's, a household, a client's, a meeting's or a proposal's; none for a prospect. */
function householdOfSubject(subject: Subject | undefined): string | undefined {
  if (!subject) return undefined
  const s = store()
  switch (subject.type) {
    case 'account': return accounts.find((a) => a.id === subject.id)?.householdId
    case 'household': return subject.id
    case 'client': return householdFixtures.find((h) => h.members.some((m) => m.clientId === subject.id))?.id
    case 'meeting': return s.meetings.find((m) => m.eventId === subject.id)?.householdId
    case 'proposal': return accounts.find((a) => a.id === s.proposals.find((p) => p.id === subject.id)?.accountId)?.householdId
    default: return undefined
  }
}
const threadOf = (threadId: string) => {
  const thread = store().threads.find((t) => t.id === threadId)
  if (!thread) throw new Error(`No thread ${threadId}`)
  return thread
}
const subjectAccount = (subject: Subject | undefined): string | undefined => (subject?.type === 'account' ? subject.id : undefined)
const isClientThread = (threadId: string) => threadOf(threadId).visibility === 'client'
const textLines = (body: string) => body.split('\n').map((line, i) => ({ line, i })).filter(({ line }) => line.trim() !== '')

/** The release lines of the Brief's Today as Adrian reads them now: orders awaiting compliance release, by account and version. */
function todayClaims(day: string): Claim[] {
  return briefToday('user-001').lines.flatMap((line): Claim[] => {
    if (line.kind !== 'release') return []
    const account = accounts.find((a) => accountDisplayName(a) === line.accountName)
    if (!account) throw new Error(`Today names an account no fixture has: ${line.accountName}`)
    return [{
      key: `today:${account.id}:v${line.version}`, source: 'today', householdId: account.householdId, day, accountId: account.id,
      text: `${line.accountName} · v${line.version} · awaiting compliance release`, figures: [], awaiting: { accountId: account.id, version: line.version },
    }]
  })
}

/** One message as the claims it makes: a finding, a carried finding, a reference row, a summary's readings, a fills report, a letter's lines. */
function claimsOf(m: Message, day: string): Claim[] {
  const thread = threadOf(m.threadId)
  const householdId = householdOfSubject(thread.subject)
  const prospectId = thread.subject?.type === 'prospect' ? thread.subject.id : undefined
  const base = { day, ...(householdId !== undefined ? { householdId } : {}), ...(prospectId !== undefined ? { prospectId } : {}) }
  switch (m.kind) {
    case 'agent_finding': return [{ ...base, key: m.id, source: 'finding', agentId: m.agentId, accountId: subjectAccount(thread.subject), text: m.claim, figures: m.figures }]
    case 'carried': {
      const from = threadOf(m.fromThreadId).subject
      const fromHousehold = householdOfSubject(from)
      return [{ day, ...(fromHousehold !== undefined ? { householdId: fromHousehold } : {}), key: m.id, source: 'carried', agentId: m.finding.agentId, accountId: subjectAccount(from), text: m.finding.claim, figures: m.finding.figures }]
    }
    case 'reference_row': {
      const rowHousehold = householdOfSubject(m.subject)
      return [{ day, ...(rowHousehold !== undefined ? { householdId: rowHousehold } : {}), key: m.id, source: 'reference', accountId: subjectAccount(m.subject), text: m.claim, figures: m.figures }]
    }
    case 'brief_summary': return [...m.decide, ...m.context].flatMap((item) => item.readings.map((r): Claim => ({
      ...base, key: `${m.id}:${item.key}:${r.findingId}`, source: 'summary', agentId: item.agentId, accountId: subjectAccount(thread.subject),
      text: item.title === undefined ? r.line : `${item.title}: ${r.line}`, figures: r.figure ? [r.figure] : [], findingId: r.findingId,
    })))
    case 'fills': return [{ ...base, key: m.id, source: 'fills', text: `${m.title} v${m.version}`, figures: [], fillIds: m.fills.map((f) => f.id) }]
    case 'text': return isClientThread(m.threadId) && isFirmAuthor(m.authorId)
      ? textLines(m.body).map(({ line, i }): Claim => ({ ...base, key: `${m.id}:${i}`, source: 'letter', text: line, figures: [] }))
      : []
    default: return []
  }
}

/** Every claim made since the keys in `seen`, which it then adds: from every thread, every proposal, every meeting's notes, every letter draft, and the Brief's Today as it reads now. */
export function newClaims(seen: Set<string>): Claim[] {
  const s = store()
  const day = easternDayOf(sessionNow())
  const fresh = (key: string) => (seen.has(key) ? false : (seen.add(key), true))
  const fromMessages = s.messages.flatMap((m) => (fresh(`msg:${m.id}`) ? claimsOf(m, day) : []))
  const fromProposals = s.proposals.flatMap((p) => p.versions.flatMap((v): Claim[] => {
    if (!fresh(`v:${p.id}:${v.n}`)) return []
    const householdId = accounts.find((a) => a.id === p.accountId)?.householdId
    const at = { ...(householdId !== undefined ? { householdId } : {}), day, accountId: p.accountId, figures: [] }
    return [
      { ...at, key: `${p.id} v${v.n}`, source: 'proposal', text: v.changeSummary },
      ...v.pretrade.violations.map((violation, i): Claim => ({ ...at, key: `${p.id} v${v.n} pre-trade ${i}`, source: 'pretrade', text: violation.message, violation })),
    ]
  }))
  const fromNotes = s.meetings.flatMap((m) => (m.notesDraft ?? []).flatMap((l): Claim[] => {
    if (!fresh(`n:${m.eventId}:${l.id}:${l.text}`)) return []
    if (!m.heldAt) throw new Error(`Meeting ${m.eventId} has notes but was never held`)
    return [{ key: l.id, source: 'notes', householdId: m.householdId, day: meetingDay(m), asOf: m.heldAt.end, text: l.text, figures: [] }]
  }))
  const fromDrafts = s.drafts.flatMap((d) => {
    if (!fresh(`d:${d.id}`)) return []
    const subject = threadOf(d.clientThreadId).subject
    const householdId = householdOfSubject(subject)
    const prospectId = subject?.type === 'prospect' ? subject.id : undefined
    return textLines(d.body).map(({ line, i }): Claim => ({ key: `${d.id}:${i}`, source: 'letter', ...(householdId !== undefined ? { householdId } : {}), ...(prospectId !== undefined ? { prospectId } : {}), day, text: line, figures: [] }))
  })
  const fromToday = todayClaims(day).filter((c) => fresh(`${c.key}:${day}`))
  return [...fromMessages, ...fromProposals, ...fromNotes, ...fromDrafts, ...fromToday]
}

/**
 * What stands on screen now as said today: the Brief's findings and summary, re-measured if the day or the book has
 * moved (opening the Brief), and its Today. Carried cards, notes and letters are dated records of when they were made.
 */
export function standingClaims(): Claim[] {
  const day = easternDayOf(sessionNow())
  const brief = store().messages.filter((m) => m.threadId === BRIEF_THREAD_ID && (m.kind === 'agent_finding' || m.kind === 'brief_summary'))
  return [...brief.flatMap((m) => claimsOf(m, day)), ...todayClaims(day)]
}

/** Words of a claim that make it about trades, fills or holdings: its text and its figures' labels. */
const speaksOfTrades = (c: Claim) => TRADE_WORDS.test(c.text) || c.figures.some((f) => TRADE_WORDS.test(f.label))

/** What disagrees: a trade claim no rule checks (unguarded), or one its rule finds the ledger contradicts. `ledger` is the household's the claims speak of; none for a prospect's. */
export function disagreements(claims: readonly Claim[], ledger: HouseholdLedger | undefined): { unguarded: string[]; disagreeing: string[]; rulesUsed: Set<string> } {
  const rulesUsed = new Set<string>()
  const unguarded: string[] = []
  const disagreeing: string[] = []
  for (const c of claims) {
    if (c.householdId !== ledger?.householdId) throw new Error(`${c.source} ${c.key} speaks of ${c.householdId ?? 'no household'}; the ledger read is ${ledger?.householdId ?? 'none'}`)
    if (ledger && c.day !== ledger.day) throw new Error(`${c.source} ${c.key} speaks of ${c.day}; the ledger was read for ${ledger.day}`)
    if (ledger && c.asOf !== undefined && c.asOf !== ledger.asOf) throw new Error(`${c.source} ${c.key} speaks as of ${c.asOf}; the ledger was read as of ${ledger.asOf}`)
    // A summary reading is checked through its finding, which stands in the same Brief and meets its own rule.
    const rules = (ledger ? RULES : UNANCHORED_RULES).filter((r) => (c.source === 'summary' ? r.name === SUMMARY_RULE : true) && r.applies(c))
    if (rules.length === 0 && speaksOfTrades(c)) unguarded.push(`${c.source} ${c.key}: ${c.text}${c.figures.length > 0 ? ` [${c.figures.map((f) => f.label).join('; ')}]` : ''}`)
    for (const r of rules) {
      rulesUsed.add(r.name)
      const why = ledger ? r.disagrees(c, ledger) : (r as UnanchoredRule).disagrees(c)
      if (why) disagreeing.push(`${r.name} · ${c.source} ${c.key}: ${why}`)
    }
  }
  return { unguarded, disagreeing, rulesUsed }
}
