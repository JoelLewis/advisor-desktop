import type { BindingActKind } from '@/types/workspace'

export const ACT_KIND_LABEL: Readonly<Record<BindingActKind, string>> = {
  approve_proposal: 'Approve proposal',
  withdraw_approval: 'Withdraw approval',
  dispose_exception: 'Dispose exception',
  send_to_client: 'Send to client',
}
