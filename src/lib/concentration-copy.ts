import type { SecurityKind } from './security-master'

export type BreachedPosition = {
  symbol: string
  weight: number
  limit: number
  kind: SecurityKind
}

const KIND_BASIS_LABEL: Record<SecurityKind, string> = {
  single_name: 'single-issuer',
  fund: 'pooled-vehicle',
  cash: 'cash',
}

function joinWithAnd(items: readonly string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * C23 fix round 1 — the breach banner previously read `positions.find(p => p.breached)!.limit`
 * and `.kind`, applying the *first* breached position's limit and basis to every symbol named in
 * the sentence. That is silently wrong the moment a breach set mixes kinds — e.g. acc-042, where
 * a single-issuer breach (D05.SI, O39.SI at the 10% limit) sits alongside a cash breach (at the
 * 15% limit): the old sentence would state the 10% single-issuer limit for the cash breach too.
 * This groups breaches by the limit actually crossed, so each group states its own basis.
 */
export function describeBreaches(breaches: readonly BreachedPosition[]): string {
  if (breaches.length === 0) return ''

  const groups = new Map<string, { kind: SecurityKind; limit: number; labels: string[] }>()
  for (const b of breaches) {
    const key = `${b.kind}:${b.limit}`
    const group = groups.get(key) ?? { kind: b.kind, limit: b.limit, labels: [] }
    group.labels.push(`${b.symbol} at ${(b.weight * 100).toFixed(1)}%`)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group) => {
      const verb = group.labels.length > 1 ? 'exceed' : 'exceeds'
      return `${joinWithAnd(group.labels)} ${verb} the ${(group.limit * 100).toFixed(0)}% ${KIND_BASIS_LABEL[group.kind]} limit.`
    })
    .join(' ')
}
