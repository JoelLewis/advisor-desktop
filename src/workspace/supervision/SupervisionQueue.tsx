import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { fmtEasternStamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { RECORD_KIND_LABEL } from '@/workspace/thread/act-kind-label'
import type { Directory } from '@/types/workspace'
import type { SupervisionItem, SupervisionQueue as Queue } from '@/types/workspace-supervision'
import { supervisionHref } from './supervision-items'

type Row = { key: string; href: string; label: string; meta: string; tags: string[] }

function rowOf(item: SupervisionItem, directory: Directory): Row {
  const href = supervisionHref(item.kind, item.id)
  switch (item.kind) {
    case 'orders': {
      const pending = item.staged.filter((o) => o.status === 'pending_compliance').length
      const approver = personIn(directory, item.approval.approverId).name
      return { key: `orders:${item.id}`, href, label: item.title, meta: `approved by ${approver} · ${pending} ${pending === 1 ? 'order' : 'orders'}`, tags: item.escalation ? ['ESCALATED'] : [] }
    }
    case 'alert':
      return { key: `alert:${item.id}`, href, label: item.title, meta: `${item.id} · raised ${fmtEasternStamp(item.alert.createdAt)}`, tags: [item.alert.severity] }
    case 'correspondence':
      return { key: `correspondence:${item.id}`, href, label: item.title, meta: `sent ${fmtEasternStamp(item.message.at)}`, tags: item.flagged ? ['FLAGGED'] : [] }
  }
}

/** The empty-group sentences are tour copy that mirrors the README (the Johnson proposal is named, not read over the API). */
export function SupervisionQueue({ queue, directory }: { queue: Queue; directory: Directory }) {
  const groups: { title: string; empty: string; rows: Row[] }[] = [
    { title: 'Orders awaiting release', empty: queue.disposedToday.length > 0 ? "No orders are waiting. Today's are under Disposed today." : 'Orders appear here once an advisor approves a proposal (Johnson Rebalance Review → Approve).', rows: queue.orders.map((i) => rowOf(i, directory)) },
    { title: 'Open alerts', empty: 'No open alerts.', rows: queue.alerts.map((i) => rowOf(i, directory)) },
    { title: 'Correspondence to review', empty: 'Sent client messages appear here for review.', rows: queue.correspondence.map((i) => rowOf(i, directory)) },
    {
      title: 'Disposed today', empty: 'Nothing disposed of yet today.',
      rows: queue.disposedToday.map(({ item, act }) => ({
        key: act.id, href: supervisionHref(item.kind, item.id), label: `${RECORD_KIND_LABEL[act.kind]} · ${item.title}`,
        meta: `${personIn(directory, act.actorId).name} · ${fmtEasternStamp(act.at)} · ${act.id}`, tags: [],
      })),
    },
  ]
  return (
    <nav aria-label="Supervision queue" className="flex flex-col gap-8">
      {groups.map((g) => (
        <Pane key={g.title} title={g.title} meta={String(g.rows.length)}>
          {g.rows.length === 0 ? <p className="text-body text-ink-3">{g.empty}</p> : (
            <ul className="flex flex-col">
              {g.rows.map((r) => (
                <li key={r.key}>
                  <NavLink to={r.href} className={({ isActive }) => cn('flex flex-col gap-1 border-l-2 py-2 pl-3 pr-2 hover:bg-face', isActive ? 'border-ink bg-face' : 'border-transparent')}>
                    <span className="text-body">{r.label}</span>
                    <span className="flex flex-wrap items-baseline gap-2 text-label text-ink-3">
                      {r.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                      <span className="tabular">{r.meta}</span>
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </Pane>
      ))}
    </nav>
  )
}
