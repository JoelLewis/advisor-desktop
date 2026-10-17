import { describe, it, expect } from 'vitest'
import { alertById, alertFingerprint } from '../alerts'
import { disposeAlert, reviewCorrespondence } from '../compliance-acts'
import { supervisionQueue } from '../supervision'
import { MARK, approvedV1, ok, release, sendLetter } from './story-fixture'

const queue = (viewer = MARK) => {
  const q = supervisionQueue(viewer)
  if (!q) throw new Error(`${viewer} has no queue`)
  return q
}

describe('the supervision queue', () => {
  it('opens with the open alerts, critical first, and nothing else', () => {
    expect(queue()).toMatchObject({ orders: [], correspondence: [], disposedToday: [] })
    expect(queue().alerts.map((a) => a.id)).toEqual(['comp-001', 'comp-002', 'comp-003', 'comp-005', 'comp-007'])
    expect(queue().alerts[1]).toMatchObject({ title: 'Single-name concentration — MSFT in Johnson Trust', context: { accountId: 'acc-001', accountName: 'Johnson Family Trust', clientId: 'cli-001', clientName: 'Robert Johnson' } })
    expect(queue().alerts[1]?.trail.map((r) => r.id)).toEqual(['sr-003'])
  })

  it('lists the staged orders of an approval as the approval record and the version it names', () => {
    const a = approvedV1()
    const [orders] = queue().orders
    expect(orders).toMatchObject({ kind: 'orders', id: 'prop-0001', title: 'Johnson rebalance · v1', accountName: 'Robert Johnson · Individual (…3847)', threadId: 'th-johnson-review', latestVersion: 1, fingerprint: a.fingerprint, approval: { actId: 'REC-0001', approverId: 'user-001', status: 'active' } })
    expect(orders?.version.n).toBe(1)
    expect(orders?.staged.every((o) => o.status === 'pending_compliance')).toBe(true)
    expect(queue('user-001').orders.map((o) => o.id)).toEqual(['prop-0001'])
  })

  it('lists sent client correspondence for the viewers who can see the client thread', () => {
    const { messageId } = sendLetter(approvedV1())
    expect(queue().correspondence).toMatchObject([{ kind: 'correspondence', id: messageId, title: 'Message to Robert Johnson', threadId: 'th-robert', flagged: false }])
    expect(queue().correspondence[0]?.message.body).toMatch(/^Dear Robert,/)
    expect(queue().correspondence[0]?.sendAct.basis?.version).toBe(1)
    expect(queue('user-003').correspondence).toEqual([])
  })

  it('moves disposed items to "Disposed today", newest first; a flagged message stays in the queue', () => {
    const a = approvedV1()
    const { act: sent, messageId } = sendLetter(a)
    const released = release(a)
    const disposed = ok(disposeAlert(MARK, 'comp-002', 'approve', alertFingerprint(alertById('comp-002')!), 'Documented exception.')).act
    const flagged = ok(reviewCorrespondence(MARK, messageId, 'flagged', sent.fingerprint, 'Follow up on the look-back.')).act
    const q = queue()
    expect(q.orders).toEqual([])
    expect(q.alerts.map((x) => x.id)).not.toContain('comp-002')
    expect(q.correspondence.map((c) => [c.id, c.flagged])).toEqual([[messageId, true]])
    expect(q.disposedToday.map((d) => [d.act.id, d.item.kind])).toEqual([[flagged.id, 'correspondence'], [disposed.id, 'alert'], [released.id, 'orders']])
    const orders = q.disposedToday[2]!.item
    if (orders.kind !== 'orders') throw new Error('orders item')
    expect(orders.staged.every((o) => o.status === 'filled')).toBe(true)
    expect(orders.fills).toHaveLength(orders.version.preview.trades.length)
    const alert = q.disposedToday[1]!.item
    if (alert.kind !== 'alert') throw new Error('alert item')
    expect(alert.disposition).toBe('approve')
    expect(alert.trail.map((r) => r.id)).toEqual(['sr-003', 'sr-004'])
  })

  it('a client has no queue', () => {
    expect(supervisionQueue('cli-001')).toBeUndefined()
    expect(supervisionQueue('nobody')).toBeUndefined()
  })
})
