import { Tag } from '@/kit/tag/Tag'
import type { ApprovalState } from '@/types/workspace-proposal'
import { approvalWords, isApprovedLatest } from './approval-words'

export function ApprovalNote({ state }: { state: ApprovalState }) {
  const approvedLatest = isApprovedLatest(state)
  const tag = state.kind === 'released' ? 'FILLED' : approvedLatest ? 'APPROVED' : state.kind === 'approved' ? 'NEWER VERSION UNAPPROVED' : 'NOT APPROVED'
  return (
    <p className="flex flex-wrap items-baseline gap-2 text-body">
      <Tag tone={approvedLatest || state.kind === 'released' ? 'solid' : 'outline'}>{tag}</Tag>
      <span>{approvalWords(state)}</span>
    </p>
  )
}
