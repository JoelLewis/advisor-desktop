import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { SEED_LAST_SEQUENCE } from '@/mocks/data/workspace-seed'
import { eventTime } from '@/lib/clock'
import type { OnboardingChecklist } from '@/types/workspace-prospect'
import { deliverDisclosure, deliverableNow } from '../disclosures'
import { requireProspect } from '../prospects'

const ADRIAN = 'user-001'
const inHerThread = () => store().messages.filter((m) => m.threadId === 'th-pell' && m.id !== 'msg-s07')
const ONBOARDING: OnboardingChecklist = { openedAt: '2026-03-02T15:01:00.000Z', acceptanceActId: 'REC-0099', items: [
  { id: 'adv_2b', label: 'Form ADV Part 2B — deliver; receipt signed with the agreement', status: 'open', ownerId: ADRIAN, due: '2026-03-03' },
  { id: 'privacy_notice', label: 'Privacy notice — deliver', status: 'open', ownerId: ADRIAN, due: '2026-03-03' },
] }

describe('deliver_disclosure', () => {
  it('records Form CRS as a record at the session clock, with its line and slip in her thread', () => {
    const r = deliverDisclosure(ADRIAN, 'prsp-011', 'form_crs')
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toEqual({
      id: 'REC-0001', kind: 'deliver_disclosure', actorId: ADRIAN, at: eventTime(SEED_LAST_SEQUENCE + 1), threadId: 'th-pell',
      subject: { type: 'prospect', id: 'prsp-011' }, fingerprint: expect.stringMatching(/^[0-9A-F]{8}$/), delivers: ['form_crs'],
      summary: 'Delivered Form CRS (client relationship summary) to Dr. Amanda Pell',
    })
    expect(requireProspect('prsp-011').disclosures).toEqual([{ document: 'form_crs', actId: 'REC-0001', at: r.act.at, deliveredBy: ADRIAN }])
    expect(inHerThread().map((m) => [m.kind, m.at])).toEqual([
      ['disclosure_delivered', eventTime(SEED_LAST_SEQUENCE + 1)], ['act', eventTime(SEED_LAST_SEQUENCE + 2)],
    ])
  })

  it('delivers each document once, naming the first delivery', () => {
    deliverDisclosure(ADRIAN, 'prsp-011', 'form_crs')
    expect(deliverDisclosure(ADRIAN, 'prsp-011', 'form_crs')).toEqual({
      ok: false, status: 409, code: 'ALREADY_DELIVERED', message: 'Form CRS (client relationship summary) was already delivered (REC-0001).',
    })
    expect(requireProspect('prsp-011').disclosures).toHaveLength(1)
    expect(store().acts).toHaveLength(1)
  })

  it('only the advisor delivers; other firm viewers are refused; outsiders are told she does not exist', () => {
    for (const viewer of ['user-002', 'user-003', 'cco-001']) expect(deliverDisclosure(viewer, 'prsp-011', 'form_crs'), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    for (const viewer of ['prsp-011', 'cli-001', 'nobody']) expect(deliverDisclosure(viewer, 'prsp-011', 'form_crs'), viewer).toMatchObject({ ok: false, status: 404, code: 'NO_PROSPECT' })
    expect(deliverDisclosure(ADRIAN, 'prsp-999', 'form_crs')).toMatchObject({ ok: false, status: 404 })
    expect(store().acts).toEqual([])
  })

  it('holds ADV 2B and the privacy notice until onboarding opens, then moves their checklist items', () => {
    expect(deliverDisclosure(ADRIAN, 'prsp-011', 'adv_2b')).toEqual({
      ok: false, status: 409, code: 'NOT_ONBOARDING', message: 'The firm delivers ADV 2B and the privacy notice when onboarding opens.',
    })
    expect(deliverableNow(requireProspect('prsp-011'))).toEqual(['form_crs', 'adv_2a'])
    requireProspect('prsp-011').onboarding = structuredCloneChecklist(ONBOARDING)
    expect(deliverableNow(requireProspect('prsp-011'))).toEqual(['form_crs', 'adv_2a', 'adv_2b', 'privacy_notice'])
    expect(deliverDisclosure(ADRIAN, 'prsp-011', 'adv_2b').ok).toBe(true)
    expect(deliverDisclosure(ADRIAN, 'prsp-011', 'privacy_notice').ok).toBe(true)
    expect(requireProspect('prsp-011').onboarding?.items.map((i) => [i.id, i.status])).toEqual([['adv_2b', 'awaiting_signature'], ['privacy_notice', 'delivered']])
    expect(deliverableNow(requireProspect('prsp-011'))).toEqual(['form_crs', 'adv_2a'])
  })
})

function structuredCloneChecklist(c: OnboardingChecklist): OnboardingChecklist {
  return { ...c, items: c.items.map((i) => ({ ...i })) }
}
