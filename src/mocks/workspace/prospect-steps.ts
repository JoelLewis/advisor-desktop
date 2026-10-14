import type { RiskAnswer } from '@/types/onboarding'
import type { BindingAct, Message, ViaPresenter } from '@/types/workspace'
import type { NextJump, OnboardingItem, PartySteps, ProspectRecord, ProspectStepName, StepState } from '@/types/workspace-prospect'
import { calendarEvents } from '@/mocks/data/calendar'
import { PRESENTER_ID, can } from '@/mocks/data/people'
import { advanceClockTo, commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import {
  ACCEPTANCE_AT, PELL_ACCEPTANCE, PELL_ANSWERS, PELL_REPLY, PELL_REPLY_QUESTIONNAIRE_ONLY, PELL_REPLY_STATEMENTS_ONLY, PELL_STATEMENTS, REPLY_AT,
} from '@/mocks/data/prospect-script'
import { PELL_ID } from '@/mocks/data/prospect-seed'
import { minuteOf } from '@/lib/clock'
import { tradingDaysAfter } from '@/lib/trading-calendar'
import { joinWords } from '@/lib/words'
import { recordAct } from './proposal-acts'
import { advanceStage, prospectOf, visibleProspect } from './prospects'
import { prospectProposalById } from './prospect-proposals'
import { scoreAnswers } from './risk-scoring'
import { isFirmViewer } from './visibility'

export type StepFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type StepDone = { ok: true; steps: PartySteps; act?: BindingAct }
export type StepInput = { answers?: readonly RiskAnswer[]; version?: number }
type Performed = { ok: true; act?: BindingAct } | StepFailure

const refuse = (status: StepFailure['status'], code: string, message: string): StepFailure => ({ ok: false, status, code, message })
const NO_PROSPECT = refuse(404, 'NO_PROSPECT', 'Prospect not found.')
const COFFEE_FIRST = refuse(409, 'COFFEE_FIRST', 'Record the coffee first; her reply follows it.')
const COFFEE_NOTE_MAX = 2000

/** The next event is recorded at `iso`, or later if the session clock has already passed it. The clock never runs backwards. */
const jumpTo = (iso: string) => advanceClockTo(minuteOf(iso) - 1)

/** Her scripted content. Only Dr. Pell has a script; any other prospect is a fixture error. */
function scriptOf(record: ProspectRecord) {
  if (record.id !== PELL_ID) throw new Error(`No script for prospect ${record.id}`)
  return { answers: PELL_ANSWERS, statements: PELL_STATEMENTS, acceptance: PELL_ACCEPTANCE }
}

/** Her reply's words name only what she still sends. */
function replyText(record: ProspectRecord): string {
  const questionnairePending = !record.questionnaire
  const statementsPending = record.statements.length === 0
  if (questionnairePending && statementsPending) return PELL_REPLY
  return questionnairePending ? PELL_REPLY_QUESTIONNAIRE_ONLY : PELL_REPLY_STATEMENTS_ONLY
}

/** Her onboarding, in the order the firm works it; dues are trading days after the acceptance day. */
const ONBOARDING_PLAN: readonly (Omit<OnboardingItem, 'due'> & { dueIn?: number })[] = [
  { id: 'account_application', label: 'Individual taxable account application', status: 'open', ownerId: 'user-002', dueIn: 2 },
  { id: 'cip', label: 'CIP identity verification', status: 'open', ownerId: 'user-002', dueIn: 2 },
  { id: 'ofac', label: 'OFAC screen', status: 'open', ownerId: 'user-002', dueIn: 1 },
  { id: 'trusted_contact', label: 'Trusted contact (custodian account form, FINRA Rule 4512)', status: 'open', ownerId: 'user-002', dueIn: 3 },
  { id: 'source_of_funds', label: 'Source of funds', status: 'open', ownerId: 'user-001', dueIn: 3 },
  { id: 'advisory_agreement', label: 'Advisory agreement', status: 'awaiting_signature', ownerId: 'user-001', dueIn: 5 },
  { id: 'adv_2b', label: 'Form ADV Part 2B — deliver; receipt signed with the agreement', status: 'open', ownerId: 'user-001', dueIn: 1 },
  { id: 'privacy_notice', label: 'Privacy notice — deliver', status: 'open', ownerId: 'user-001', dueIn: 1 },
  { id: 'acat', label: 'ACAT transfer', status: 'not_started', ownerId: 'user-002' },
]

function postParty(record: ProspectRecord, step: 'questionnaire' | 'statements', summary: string, at: string): Message {
  const message: Message = { kind: 'party_step', id: nextId('msg'), threadId: record.threadId, at, authorId: record.id, step, summary }
  store().messages.push(message)
  return message
}

function postHerText(record: ProspectRecord, body: string): void {
  store().messages.push({ kind: 'text', id: nextId('msg'), threadId: record.threadId, authorId: record.id, at: nextAt(), body })
}

function answer(record: ProspectRecord, via: ViaPresenter, answers: readonly RiskAnswer[]): Performed {
  if (!record.coffee) return COFFEE_FIRST
  if (record.questionnaire) return refuse(409, 'ALREADY_ANSWERED', `She answered the questionnaire at ${record.questionnaire.receivedAt}.`)
  const scored = scoreAnswers(answers)
  if (!scored.ok) return refuse(400, 'BAD_ANSWERS', scored.message)
  const at = nextAt()
  const message = postParty(record, 'questionnaire', 'Answered the risk questionnaire.', at)
  record.questionnaire = { answers: answers.map((a) => ({ ...a })), receivedAt: at }
  record.steps.push({ kind: 'questionnaire', at, messageId: message.id, viaPresenter: via })
  advanceStage(record, 'discovery', at)
  return { ok: true }
}

function share(record: ProspectRecord, via: ViaPresenter): Performed {
  if (!record.coffee) return COFFEE_FIRST
  if (record.statements.length > 0) return refuse(409, 'ALREADY_SHARED', 'She already shared her statements.')
  const statements = scriptOf(record).statements.map((s) => ({ ...s, holdings: s.holdings.map((h) => ({ ...h })) }))
  const at = nextAt()
  const named = statements.map((s) => `${s.custodian} ${s.accountType === '403b' ? '403(b)' : 'taxable brokerage'}`)
  const count = statements.length === 2 ? 'two' : String(statements.length)
  const message = postParty(record, 'statements', `Shared ${count} statements: ${joinWords(named)}.`, at)
  record.statements = statements
  record.steps.push({ kind: 'statements', at, messageId: message.id, viaPresenter: via })
  advanceStage(record, 'discovery', at)
  return { ok: true }
}

function openOnboarding(record: ProspectRecord, acceptance: BindingAct): void {
  if (record.onboarding) return
  const day = acceptance.at.slice(0, 10)
  const items: OnboardingItem[] = ONBOARDING_PLAN.map(({ dueIn, ...item }) => ({ ...item, ...(dueIn === undefined ? {} : { due: tradingDaysAfter(day, dueIn) }) }))
  record.onboarding = { openedAt: acceptance.at, acceptanceActId: acceptance.id, items }
  store().messages.push({ kind: 'onboarding_opened', id: nextId('msg'), threadId: record.internalThreadId, at: nextAt(), prospectId: record.id,
    acceptanceActId: acceptance.id, items: items.map((i) => ({ ...i })) })
}

function accept(record: ProspectRecord, via: ViaPresenter, version: number | undefined): Performed {
  const sent = record.sent
  if (!sent) return refuse(409, 'NOT_SENT', 'Nothing has been sent to her to accept.')
  if (record.accepted) return refuse(409, 'ALREADY_ACCEPTED', `She already accepted v${record.accepted.version} (${record.accepted.actId}).`)
  if (version !== undefined && version !== sent.version) return refuse(409, 'NOT_THE_SENT_VERSION', `v${sent.version} is the version sent to her.`)
  const proposal = prospectProposalById(sent.proposalId)
  const v = proposal?.versions.find((x) => x.n === sent.version)
  if (!proposal || !v) throw new Error(`The sent record ${sent.actId} names a missing proposal version`)
  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'accept_proposal', actorId: record.id, at, threadId: record.threadId,
    subject: { type: 'prospect_proposal', id: proposal.id }, version: v.n, fingerprint: v.fingerprint,
    summary: `${record.name} accepted v${v.n} of the ${proposal.title}`, viaPresenter: via,
  }
  recordAct(act)
  const marker = store().messages.find((m) => m.kind === 'act' && m.actId === act.id)
  if (!marker) throw new Error(`The acceptance ${act.id} has no slip`)
  record.accepted = { proposalId: proposal.id, version: v.n, actId: act.id, at }
  record.steps.push({ kind: 'acceptance', at, messageId: marker.id, actId: act.id, viaPresenter: via })
  advanceStage(record, 'accepted', at)
  advanceStage(record, 'onboarding', at)
  openOnboarding(record, act)
  return { ok: true, act }
}

function perform(record: ProspectRecord, step: ProspectStepName, via: ViaPresenter, input: StepInput): Performed {
  switch (step) {
    case 'questionnaire': return answer(record, via, input.answers ?? scriptOf(record).answers)
    case 'statements': return share(record, via)
    case 'accept': return accept(record, via, input.version)
  }
}

const done = (record: ProspectRecord, performed: Performed): StepDone | StepFailure =>
  performed.ok ? { ok: true, steps: partyStepsOf(record), ...(performed.act ? { act: performed.act } : {}) } : performed

export function recordCoffee(viewerId: string, prospectId: string, body: string): { ok: true; message: Message } | StepFailure {
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return NO_PROSPECT
  if (!can(viewerId, 'prepare_meeting')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor records the coffee.')
  if (record.coffee) return refuse(409, 'ALREADY_RECORDED', `The coffee was already recorded (${record.coffee.messageId}).`)
  const text = body.trim()
  if (text.length === 0 || text.length > COFFEE_NOTE_MAX) return refuse(400, 'BAD_NOTE', `Write the note in 1 to ${COFFEE_NOTE_MAX} characters.`)
  const event = calendarEvents.find((e) => e.id === record.eventId)
  if (!event) throw new Error(`Prospect ${record.id} names a missing event ${record.eventId}`)
  const start = new Date(event.startTime).toISOString()
  const end = new Date(event.endTime).toISOString()
  jumpTo(end)
  const at = nextAt()
  const message: Message = { kind: 'prospect_note', id: nextId('msg'), threadId: record.internalThreadId, at, authorId: viewerId, prospectId: record.id,
    eventId: record.eventId, title: `Coffee with ${record.name}`, start, end, body: text }
  store().messages.push(message)
  record.coffee = { at, messageId: message.id, authorId: viewerId }
  return { ok: true, message }
}

/** A step she takes herself (the presenter viewing as her). The firm is told the step is hers; anyone else, that she does not exist. */
export function herStep(viewerId: string, prospectId: string, step: ProspectStepName, input: StepInput = {}): StepDone | StepFailure {
  const record = prospectOf(prospectId)
  if (record && viewerId === record.id) return done(record, perform(record, step, { presenterId: PRESENTER_ID, path: 'view_as' }, input))
  if (record && visibleProspect(viewerId, prospectId)) return refuse(403, 'NOT_HER_STEP', `This step is hers; the presenter uses "Demo · act as ${record.salutation}".`)
  return NO_PROSPECT
}

/** "Demo · act as Dr. Pell": her scripted step, recorded as her with the shortcut marked. Only the presenter. */
export function actAsProspect(presenterId: string, prospectId: string, step: ProspectStepName): StepDone | StepFailure {
  if (!isFirmViewer(presenterId)) return NO_PROSPECT
  if (presenterId !== PRESENTER_ID) return refuse(403, 'NOT_PERMITTED', 'Only the presenter can act as the prospect.')
  const record = visibleProspect(presenterId, prospectId)
  if (!record) return NO_PROSPECT
  return done(record, perform(record, step, { presenterId, path: 'shortcut' }, {}))
}

/** The labelled clock jumps: her reply (Thu 26 Feb 09:10 ET) and her acceptance (Mon 2 Mar 10:00 ET). Only the presenter. */
export function advanceProspect(viewerId: string, prospectId: string, to: 'reply' | 'acceptance'): StepDone | StepFailure {
  if (!isFirmViewer(viewerId)) return NO_PROSPECT
  if (viewerId !== PRESENTER_ID) return refuse(403, 'NOT_PERMITTED', 'Only the presenter moves the clock.')
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return NO_PROSPECT
  const via: ViaPresenter = { presenterId: viewerId, path: 'scripted' }
  const script = scriptOf(record)
  if (to === 'reply') {
    if (!record.coffee) return COFFEE_FIRST
    if (record.questionnaire && record.statements.length > 0) return refuse(409, 'ALREADY_REPLIED', 'Her reply is already on file.')
    jumpTo(REPLY_AT)
    postHerText(record, replyText(record))
    for (const step of ['questionnaire', 'statements'] as const) {
      const pending = step === 'questionnaire' ? !record.questionnaire : record.statements.length === 0
      if (!pending) continue
      const r = perform(record, step, via, {})
      if (!r.ok) throw new Error(`Her scripted ${step} was refused after the jump: ${r.message}`)
    }
    return done(record, { ok: true })
  }
  if (!record.sent) return refuse(409, 'NOT_SENT', 'Nothing has been sent to her to accept.')
  if (record.accepted) return refuse(409, 'ALREADY_ACCEPTED', `She already accepted v${record.accepted.version} (${record.accepted.actId}).`)
  jumpTo(ACCEPTANCE_AT)
  postHerText(record, script.acceptance)
  const r = perform(record, 'accept', via, {})
  if (!r.ok) throw new Error(`Her scripted acceptance was refused after the jump: ${r.message}`)
  return done(record, r)
}

function partyStepsOf(record: ProspectRecord): PartySteps {
  const replyStep = (isDone: boolean): StepState => (isDone ? 'done' : record.coffee ? 'open' : 'unavailable')
  return {
    questionnaire: replyStep(record.questionnaire !== undefined), statements: replyStep(record.statements.length > 0),
    acceptance: record.accepted ? 'done' : record.sent ? 'open' : 'unavailable',
    ...(record.sent ? { sentVersion: record.sent.version } : {}),
  }
}

export function partySteps(viewerId: string, prospectId: string): PartySteps | undefined {
  const record = prospectOf(prospectId)
  return record && (viewerId === record.id || visibleProspect(viewerId, prospectId)) ? partyStepsOf(record) : undefined
}

export function nextJumpOf(record: ProspectRecord): NextJump | undefined {
  if (!record.questionnaire || record.statements.length === 0) {
    return { to: 'reply', at: REPLY_AT, ...(record.coffee ? {} : { blockedReason: 'Record the coffee first; her reply follows it.' }) }
  }
  if (record.accepted) return undefined
  return { to: 'acceptance', at: ACCEPTANCE_AT, ...(record.sent ? {} : { blockedReason: 'Send her the proposal first; her acceptance follows it.' }) }
}
