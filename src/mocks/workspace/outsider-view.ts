import type { BindingAct, Message } from '@/types/workspace'
import { store } from '../data/workspace-store'
import { PARTY_VISIBLE_ACTS } from './party-visible-acts'

const easternParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
})

const pad = (n: number) => String(n).padStart(2, '0')

/** An instant as Eastern wall time with its offset ("2026-02-25T07:10:00-05:00"): the outsider is never served a UTC stamp. */
function easternIso(utcIso: string): string {
  const instant = Math.floor(Date.parse(utcIso) / 1000) * 1000
  if (Number.isNaN(instant)) throw new Error(`Not an ISO instant: ${utcIso}`)
  const part = new Map<string, number>(easternParts.formatToParts(new Date(instant)).map((p) => [p.type, Number(p.value)]))
  const field = (type: string) => {
    const value = part.get(type)
    if (value === undefined) throw new Error(`No ${type} in the Eastern parts of ${utcIso}`)
    return value
  }
  const wall = Date.UTC(field('year'), field('month') - 1, field('day'), field('hour'), field('minute'), field('second'))
  const offsetMinutes = (wall - instant) / 60000
  const sign = offsetMinutes < 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  const stamp = `${field('year')}-${pad(field('month'))}-${pad(field('day'))}T${pad(field('hour'))}:${pad(field('minute'))}:${pad(field('second'))}`
  return `${stamp}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

/** The acts that reached a thread: made in it, or delivered to it by a send that reached several. */
export function actsReaching(threadId: string): BindingAct[] {
  return store().acts.filter((a) => a.threadId === threadId || (a.deliveries ?? []).some((d) => d.threadId === threadId))
}

/** The thread's records as an outsider names them: "1", "2", … in the order they were made. Never the firm's record ids. */
function anchorsOf(threadId: string): Map<string, string> {
  const anchors = new Map<string, string>()
  actsReaching(threadId)
    .filter((a) => PARTY_VISIBLE_ACTS.has(a.kind))
    .sort((a, b) => a.at.localeCompare(b.at))
    .forEach((a, i) => anchors.set(a.id, String(i + 1)))
  return anchors
}

function anchorFor(anchors: Map<string, string>, actId: string): string {
  const anchor = anchors.get(actId)
  if (anchor === undefined) throw new Error(`Act ${actId} is not a record an outsider can read`)
  return anchor
}

/** An act as the outsider's slip needs it: an opaque id, an Eastern time, no fingerprint. Provenance is stripped by the caller. */
export type OutsiderAct = Omit<BindingAct, 'fingerprint'>

const withoutFingerprint = ({ fingerprint: _fingerprint, ...act }: BindingAct): OutsiderAct => act

/** The act as the thread being read holds it: its own thread id, never the firm thread a multi-delivery send was made in. */
function outsiderAct(act: BindingAct, threadId: string, anchors: Map<string, string>): OutsiderAct {
  return { ...withoutFingerprint(act), id: anchorFor(anchors, act.id), threadId, at: easternIso(act.at) }
}

export function actsForOutsider(threadId: string, acts: BindingAct[]): OutsiderAct[] {
  const anchors = anchorsOf(threadId)
  return acts.filter((a) => PARTY_VISIBLE_ACTS.has(a.kind)).map((a) => outsiderAct(a, threadId, anchors))
}

export function actForOutsider(act: BindingAct, readingThreadId: string): OutsiderAct {
  return outsiderAct(act, readingThreadId, anchorsOf(readingThreadId))
}

export function messageForOutsider(message: Message, anchors: Map<string, string> = anchorsOf(message.threadId)): Message {
  const at = easternIso(message.at)
  switch (message.kind) {
    case 'act': return { ...message, at, actId: anchorFor(anchors, message.actId) }
    case 'disclosure_delivered': return { ...message, at, actId: anchorFor(anchors, message.actId) }
    case 'onboarding_opened': return { ...message, at, acceptanceActId: anchorFor(anchors, message.acceptanceActId) }
    default: return { ...message, at }
  }
}

export function messagesForOutsider(threadId: string, messages: Message[]): Message[] {
  const anchors = anchorsOf(threadId)
  return messages.map((m) => messageForOutsider(m, anchors))
}
