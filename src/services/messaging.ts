import { get, post } from './api-client'
import type { Thread, Message, MessageAttachment } from '@/types/messaging'

export function getThreads() {
  return get<Thread[]>('/messaging/threads')
}

export function getMessages(threadId: string) {
  return get<Message[]>(`/messaging/threads/${threadId}/messages`)
}

export function sendMessage(threadId: string, content: string, attachments?: MessageAttachment[]) {
  return post<Message>(`/messaging/threads/${threadId}/messages`, { content, attachments })
}

export function createThread(subject: string, participantIds: string[], entityContext?: Thread['entityContext']) {
  return post<Thread>('/messaging/threads', { subject, participantIds, entityContext })
}
