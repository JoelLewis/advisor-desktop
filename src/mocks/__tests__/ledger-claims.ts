import type { AgentId, Figure, Message } from '@/types/workspace'
import { sessionNow, store } from '@/mocks/data/workspace-store'
import { accounts } from '@/mocks/data/accounts'
import { clientRiskOf } from '@/mocks/reference/risk'
import { REBALANCE_LINE } from '@/mocks/agents/meeting-notes'
import type { HouseholdLedger } from '@/mocks/workspace/household-ledger'
import { rebalanceStateOf } from '@/mocks/workspace/meeting-agents'
import { meetingDay } from '@/mocks/workspace/meetings'
import { clientDate } from '@/kit/measure'
import { easternDayOf } from '@/lib/eastern-day'

/**
 * Something the product said about the Johnsons' book, with what it said it from. `day` is the New York day the claim
 * speaks of: the session's day when it was made, except the meeting notes, which record the meeting's own day and are
 * read against the ledger as the meeting ended (`asOf`).
 */
type Claim = { key: string; source: 'finding' | 'proposal' | 'fills' | 'notes' | 'letter'; day: string; asOf?: string; agentId?: AgentId; accountId?: string; text: string; figures: Figure[]; fillIds?: string[] }
type Rule = { name: string; applies: (c: Claim) => boolean; disagrees: (c: Claim, ledger: HouseholdLedger) => string | undefined }

/** Words that make a claim about trades, fills or holdings: such a claim must be checked by a rule. */
const TRADE_WORDS = /\b(?:filled|bought|sold at a loss (?:today|recently)|working orders?|this morning's rebalance|awaiting compliance release|approved or traded)\b/i
const JOHNSON_THREADS: ReadonlySet<string> = new Set(['th-brief', 'th-johnson-review', 'th-johnson-meeting'])
const CLIENT_THREADS: ReadonlySet<string> = new Set(['th-robert', 'th-patricia'])

const symbolIn = (c: Claim, prefix: string): string => {
  const figure = c.figures.find((f) => f.label.startsWith(prefix))
  if (!figure) throw new Error(`"${c.text}" carries no "${prefix}" figure`)
  return figure.label.slice(prefix.length)
}
const accountOf = (c: Claim, ledger: HouseholdLedger) => {
  const found = ledger.accounts.find((a) => a.account.id === c.accountId)
  if (!found) throw new Error(`"${c.text}" names no Johnson account`)
  return found
}
const boughtToday = (ledger: HouseholdLedger, accountId: string | undefined, symbol: string) =>
  ledger.fillsOnDay.some((f) => f.accountId === accountId && f.side === 'buy' && f.symbol === symbol)
const fail = (wrong: boolean, why: string) => (wrong ? why : undefined)

const RULES: readonly Rule[] = [
  { name: 'harvest offered', applies: (c) => c.agentId === 'harvest-scanner' && /can be sold at a loss today/.test(c.text) && !/^No position/.test(c.text),
    disagrees: (c, l) => { const s = symbolIn(c, 'Loss allowed now · '); return fail(!accountOf(c, l).positions.some((p) => p.symbol === s) || boughtToday(l, c.accountId, s), `${s} offered for harvest but not held, or bought today`) } },
  { name: 'realized loss', applies: (c) => /was sold at a loss (?:today|recently)/.test(c.text),
    disagrees: (c, l) => {
      const s = symbolIn(c, 'Loss realized · ')
      const today = /sold at a loss today/.test(c.text)
      return fail(!l.realizedSales.some((r) => r.symbol === s && r.realizedGainLoss < 0 && (today ? r.saleDate === l.day : r.saleDate < l.day)), `${s} realized loss ${today ? 'today' : 'recently'} not in the ledger`)
    } },
  { name: 'bought today', applies: (c) => /was bought today in this account/.test(c.text),
    disagrees: (c, l) => { const s = symbolIn(c, 'Bought today · '); return fail(!boughtToday(l, c.accountId, s), `${s} said bought today, no buy fill today`) } },
  { name: 'replacement held', applies: (c) => /was bought in place of the/.test(c.text),
    disagrees: (c, l) => {
      const figure = c.figures.find((f) => f.label.endsWith(' weight'))
      const s = figure?.label.replace(/ weight$/, '')
      return fail(s === undefined || !accountOf(c, l).positions.some((p) => p.symbol === s) || !l.realizedSales.some((r) => r.replacementSymbol === s), `replacement ${s ?? '?'} not held or not a replacement`)
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
  { name: "letter: no trades in Patricia's accounts", applies: (c) => c.source === 'letter' && /We won't trade in Patricia's accounts/.test(c.text),
    disagrees: (_, l) => {
      const hers = new Set(accounts.filter((a) => a.clientId === 'cli-002').map((a) => a.id))
      return fail(l.openOrders.some((o) => hers.has(o.accountId)) || l.fillsOnDay.some((f) => hers.has(f.accountId)), "the letter promises no trades in Patricia's accounts; the ledger has one")
    } },
  { name: 'fills report', applies: (c) => c.source === 'fills',
    disagrees: (c, l) => fail((c.fillIds ?? []).some((id) => !l.fillsOnDay.some((f) => f.id === id)), 'the fills report names a fill the ledger does not have today') },
]

const subjectAccount = (threadId: string): string | undefined => {
  const subject = store().threads.find((t) => t.id === threadId)?.subject
  return subject?.type === 'account' ? subject.id : undefined
}

/** Every claim made since the keys in `seen`, which it then adds. */
export function newClaims(seen: Set<string>): Claim[] {
  const s = store()
  const day = easternDayOf(sessionNow())
  const fresh = (key: string) => (seen.has(key) ? false : (seen.add(key), true))
  const messages = s.messages.filter((m) => JOHNSON_THREADS.has(m.threadId) || CLIENT_THREADS.has(m.threadId))
  const fromMessages = messages.flatMap((m: Message): Claim[] => {
    if (!fresh(`msg:${m.id}`)) return []
    if (m.kind === 'agent_finding') return [{ key: m.id, source: 'finding', day, agentId: m.agentId, accountId: subjectAccount(m.threadId), text: m.claim, figures: m.figures }]
    if (m.kind === 'fills') return [{ key: m.id, source: 'fills', day, text: `${m.title} v${m.version}`, figures: [], fillIds: m.fills.map((f) => f.id) }]
    if (m.kind === 'text' && CLIENT_THREADS.has(m.threadId) && !m.authorId.startsWith('cli-')) return m.body.split('\n').map((line, i) => ({ key: `${m.id}:${i}`, source: 'letter', day, text: line, figures: [] }))
    return []
  })
  const fromProposals = s.proposals.flatMap((p) => p.versions.flatMap((v): Claim[] => (fresh(`v:${p.id}:${v.n}`) ? [{ key: `${p.id} v${v.n}`, source: 'proposal', day, accountId: p.accountId, text: v.changeSummary, figures: [] }] : [])))
  const fromNotes = s.meetings.flatMap((m) => (m.notesDraft ?? []).flatMap((l): Claim[] => {
    if (!fresh(`n:${m.eventId}:${l.id}:${l.text}`)) return []
    if (!m.heldAt) throw new Error(`Meeting ${m.eventId} has notes but was never held`)
    return [{ key: l.id, source: 'notes', day: meetingDay(m), asOf: m.heldAt.end, text: l.text, figures: [] }]
  }))
  const fromDrafts = s.drafts.filter((d) => CLIENT_THREADS.has(d.clientThreadId)).flatMap((d) => (fresh(`d:${d.id}`) ? d.body.split('\n').map((line, i): Claim => ({ key: `${d.id}:${i}`, source: 'letter', day, text: line, figures: [] })) : []))
  return [...fromMessages, ...fromProposals, ...fromNotes, ...fromDrafts]
}

/** What disagrees: a trade claim no rule checks (unguarded), or one its rule finds the ledger contradicts. */
export function disagreements(claims: readonly Claim[], ledger: HouseholdLedger): { unguarded: string[]; disagreeing: string[]; rulesUsed: Set<string> } {
  const rulesUsed = new Set<string>()
  const unguarded: string[] = []
  const disagreeing: string[] = []
  for (const c of claims) {
    if (c.day !== ledger.day) throw new Error(`${c.source} ${c.key} speaks of ${c.day}; the ledger was read for ${ledger.day}`)
    if (c.asOf !== undefined && c.asOf !== ledger.asOf) throw new Error(`${c.source} ${c.key} speaks as of ${c.asOf}; the ledger was read as of ${ledger.asOf}`)
    const rules = RULES.filter((r) => r.applies(c))
    if (rules.length === 0 && TRADE_WORDS.test(c.text)) unguarded.push(`${c.source} ${c.key}: ${c.text}`)
    for (const r of rules) {
      rulesUsed.add(r.name)
      const why = r.disagrees(c, ledger)
      if (why) disagreeing.push(`${r.name} · ${c.source} ${c.key}: ${why}`)
    }
  }
  return { unguarded, disagreeing, rulesUsed }
}
