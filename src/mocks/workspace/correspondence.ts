import type { BindingAct, CorrespondenceOutcome, Thread } from '@/types/workspace'
import type { TextMessage } from '@/types/workspace-supervision'
import { store } from '@/mocks/data/workspace-store'

export const isCorrespondenceOutcome = (value: unknown): value is CorrespondenceOutcome => value === 'reviewed' || value === 'flagged'

/** A message the firm sent a client: the send record, the message as delivered, and the client thread it is in. */
export type SentMessage = { act: BindingAct; message: TextMessage; thread: Thread }

/** Every message the firm sent a client, one per delivery: a recap to both spouses is two messages for compliance to review. */
export function sentMessages(): SentMessage[] {
  const s = store()
  return s.acts.flatMap((act) => {
    if (act.kind !== 'send_to_party') return []
    const deliveries = act.deliveries ?? (act.messageId && act.threadId ? [{ threadId: act.threadId, messageId: act.messageId }] : [])
    return deliveries.flatMap((d) => {
      const message = s.messages.find((m): m is TextMessage => m.kind === 'text' && m.id === d.messageId)
      const thread = s.threads.find((t) => t.id === d.threadId)
      return message && thread ? [{ act, message, thread }] : []
    })
  })
}

export const sentMessage = (messageId: string): SentMessage | undefined => sentMessages().find((m) => m.message.id === messageId)

export function latestReview(messageId: string): BindingAct | undefined {
  const reviews = store().acts.filter((a) => a.kind === 'review_correspondence' && a.subject?.type === 'message' && a.subject.id === messageId)
  return reviews[reviews.length - 1]
}
