import { describe, it, expect } from 'vitest'
import { alertById, alertFingerprint } from '../alerts'
import { archiveFor } from '../archive'
import { ARCHIVE_KINDS, isArchiveKind } from '@/types/workspace-supervision'
import { disposeAlert, reviewCorrespondence } from '../compliance-acts'
import { MARK, approvedV1, ok, release, sendLetter } from './story-fixture'

function session() {
  const a = approvedV1()
  const { act: sent, messageId } = sendLetter(a)
  release(a)
  ok(disposeAlert(MARK, 'comp-002', 'approve', alertFingerprint(alertById('comp-002')!), 'Documented exception.'))
  ok(reviewCorrespondence(MARK, messageId, 'reviewed', sent.fingerprint, 'Accurate and balanced.'))
}
const kinds = (viewer: string, filters = {}) => archiveFor(viewer, filters)!.entries.map((e) => (e.kind === 'act' ? e.act.kind : e.kind))

describe('the archive', () => {
  it('lists every recorded act and sent message in order, each with its thread and client', () => {
    session()
    expect(kinds(MARK)).toEqual(['approve_proposal', 'send_to_party', 'sent_message', 'release_orders', 'dispose_alert', 'review_correspondence'])
    const entries = archiveFor(MARK, {})!.entries
    expect(entries.find((e) => e.kind === 'act' && e.act.kind === 'release_orders')).toMatchObject({ threadId: 'th-johnson-review', threadTitle: 'Johnson Rebalance Review', clientId: 'cli-001', clientName: 'Robert Johnson' })
    expect(entries.find((e) => e.kind === 'act' && e.act.kind === 'review_correspondence')).toMatchObject({ threadId: 'th-robert', clientId: 'cli-001' })
    const alert = entries.find((e) => e.kind === 'act' && e.act.kind === 'dispose_alert')
    expect(alert).toMatchObject({ clientId: 'cli-001' })
    expect(alert && 'threadId' in alert ? alert.threadId : undefined).toBeUndefined()
    expect(entries.find((e) => e.kind === 'sent_message')).toMatchObject({ threadId: 'th-robert', clientName: 'Robert Johnson' })
  })

  it('filters by client, kind and date, and lists what the filters can choose', () => {
    session()
    expect(kinds(MARK, { kind: 'release_orders' })).toEqual(['release_orders'])
    expect(kinds(MARK, { kind: 'sent_message' })).toEqual(['sent_message'])
    expect(kinds(MARK, { clientId: 'cli-001' })).toHaveLength(6)
    expect(kinds(MARK, { clientId: 'cli-003' })).toEqual([])
    expect(kinds(MARK, { from: '2026-02-25', to: '2026-02-25' })).toHaveLength(6)
    expect(kinds(MARK, { from: '2026-02-26' })).toEqual([])
    expect(archiveFor(MARK, { kind: 'release_orders' })).toMatchObject({ clients: [{ id: 'cli-001', name: 'Robert Johnson' }], dates: ['2026-02-25'] })
  })

  it('shows each viewer only the threads they can see; a client has no archive', () => {
    session()
    expect(kinds('user-003')).toEqual(['approve_proposal', 'release_orders', 'dispose_alert'])
    expect(archiveFor('cli-001', {})).toBeUndefined()
  })

  it('lists the meeting record kind among the kinds a filter can name', () => {
    expect(ARCHIVE_KINDS).toContain('file_meeting_record')
    expect(isArchiveKind('file_meeting_record')).toBe(true)
  })
})
