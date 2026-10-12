import { Tag } from '@/kit/tag/Tag'
import type { ApprovalState } from '@/types/workspace-proposal'
import { approvalWords, isApprovedLatest } from './approval-words'

export function ApprovalNote({ state }: { state: ApprovalState }) {
  const tag = isApprovedLatest(state) ? 'APPROVED' : state.kind === 'approved' ? 'NEWER VERSION UNAPPROVED' : 'NOT APPROVED'
  return (
    <p className="flex flex-wrap items-baseline gap-2 text-body">
      <Tag tone={isApprovedLatest(state) ? 'solid' : 'outline'}>{tag}</Tag>
      <span>{approvalWords(state)}</span>
    </p>
  )
}
