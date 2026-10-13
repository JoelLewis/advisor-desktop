import type { BindingAct } from '@/types/workspace'
import type { DisclosureDelivery, DisclosureDocument, ProspectRecord } from '@/types/workspace-prospect'
import { DISCLOSURE_DOCUMENTS, DISCLOSURE_TITLES } from '@/types/workspace-prospect'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { recordAct } from './proposal-acts'
import { visibleProspect } from './prospects'

export type DisclosureFailure = { ok: false; status: 403 | 404 | 409; code: string; message: string }
const refuse = (status: DisclosureFailure['status'], code: string, message: string): DisclosureFailure => ({ ok: false, status, code, message })

/** Firm policy: these two are delivered when onboarding opens (ADV 2B with the agreement for her signature). */
export const AT_ONBOARDING: ReadonlySet<DisclosureDocument> = new Set<DisclosureDocument>(['adv_2b', 'privacy_notice'])

export const deliveryOf = (record: ProspectRecord, document: DisclosureDocument): DisclosureDelivery | undefined =>
  record.disclosures.find((d) => d.document === document)

/** What may be delivered now: each document not yet delivered, the onboarding ones once onboarding is open. */
export function deliverableNow(record: ProspectRecord): DisclosureDocument[] {
  return DISCLOSURE_DOCUMENTS.filter((d) => deliveryOf(record, d) === undefined && (!AT_ONBOARDING.has(d) || record.onboarding !== undefined))
}

export function recordDelivery(record: ProspectRecord, document: DisclosureDocument, actId: string, actorId: string, at: string): void {
  record.disclosures.push({ document, actId, at, deliveredBy: actorId })
  store().messages.push({ kind: 'disclosure_delivered', id: nextId('msg'), threadId: record.threadId, at, prospectId: record.id, document, actId })
  const item = record.onboarding?.items.find((i) => i.id === document)
  if (item) item.status = document === 'adv_2b' ? 'awaiting_signature' : 'delivered'
}

export function deliverDisclosure(viewerId: string, prospectId: string, document: DisclosureDocument): { ok: true; act: BindingAct } | DisclosureFailure {
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return refuse(404, 'NO_PROSPECT', 'Prospect not found.')
  if (!can(viewerId, 'deliver_disclosure')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor delivers disclosures.')
  const earlier = deliveryOf(record, document)
  if (earlier) return refuse(409, 'ALREADY_DELIVERED', `${DISCLOSURE_TITLES[document]} was already delivered (${earlier.actId}).`)
  if (AT_ONBOARDING.has(document) && !record.onboarding) return refuse(409, 'NOT_ONBOARDING', 'The firm delivers ADV 2B and the privacy notice when onboarding opens.')
  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'deliver_disclosure', actorId: viewerId, at, threadId: record.threadId,
    subject: { type: 'prospect', id: record.id }, fingerprint: fingerprint(`${document}|${DISCLOSURE_TITLES[document]}`), delivers: [document],
    summary: `Delivered ${DISCLOSURE_TITLES[document]} to ${record.name}`,
  }
  // The delivery line first, at the act's time; recordAct then files the act and posts its slip after it.
  recordDelivery(record, document, act.id, viewerId, at)
  recordAct(act)
  return { ok: true, act }
}
