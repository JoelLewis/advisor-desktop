import type { BindingAct } from '@/types/workspace'
import type { SupervisionItem, SupervisionItemKind, SupervisionQueue } from '@/types/workspace-supervision'

export const ITEM_KINDS: readonly SupervisionItemKind[] = ['orders', 'alert', 'correspondence']
export const isItemKind = (value: string): value is SupervisionItemKind => (ITEM_KINDS as readonly string[]).includes(value)
export const supervisionHref = (kind: SupervisionItemKind, id: string) => `/supervision/${kind}/${encodeURIComponent(id)}`
export const ITEM_HEADING: Readonly<Record<SupervisionItemKind, string>> = { orders: 'Orders', alert: 'Alert', correspondence: 'Correspondence' }

/** The item a route names — open in the queue, or disposed of today — with the acts recorded on it today, newest first. */
export type FoundItem = { item: SupervisionItem; open: boolean; recorded: BindingAct[] }

export function findItem(queue: SupervisionQueue, kind: SupervisionItemKind, id: string): FoundItem | undefined {
  const open = [...queue.orders, ...queue.alerts, ...queue.correspondence].find((i) => i.kind === kind && i.id === id)
  const disposed = queue.disposedToday.filter((d) => d.item.kind === kind && d.item.id === id)
  const item = open ?? disposed[0]?.item
  return item ? { item, open: open !== undefined, recorded: disposed.map((d) => d.act) } : undefined
}
