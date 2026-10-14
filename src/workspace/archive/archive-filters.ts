import type { SelectOption } from '@/kit/select/Select'
import { ARCHIVE_KINDS, isArchiveKind, type ArchiveFilters, type ArchiveKind } from '@/types/workspace-supervision'
import { ACT_KIND_LABEL } from '@/workspace/thread/act-kind-label'

const ARCHIVE_KIND_LABEL: Readonly<Record<ArchiveKind, string>> = { ...ACT_KIND_LABEL, sent_message: 'Sent message' }

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export const KIND_OPTIONS: readonly SelectOption[] = [{ value: '', label: 'All kinds' }, ...ARCHIVE_KINDS.map((k) => ({ value: k, label: ARCHIVE_KIND_LABEL[k] }))]

/** The filters the URL states; a value the archive cannot read is left out rather than guessed at. */
export function filtersFrom(params: URLSearchParams): ArchiveFilters {
  const partyId = params.get('partyId') ?? ''
  const kind = params.get('kind') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  return {
    ...(partyId ? { partyId } : {}), ...(isArchiveKind(kind) ? { kind } : {}),
    ...(ISO_DAY.test(from) ? { from } : {}), ...(ISO_DAY.test(to) ? { to } : {}),
  }
}

export function withFilter(params: URLSearchParams, key: keyof ArchiveFilters, value: string): URLSearchParams {
  const next = new URLSearchParams(params)
  if (value) next.set(key, value)
  else next.delete(key)
  return next
}
