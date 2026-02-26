import { http, HttpResponse } from 'msw'
import { threads, threadMessages, teamMembers } from '../data/messages'
import type { MessageAttachment } from '@/types/messaging'

export const messagingHandlers = [
  http.get('/api/messaging/threads', () => {
    return HttpResponse.json(threads)
  }),

  http.get('/api/messaging/threads/:threadId/messages', ({ params }) => {
    const messages = threadMessages[String(params.threadId)]
    if (!messages) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(messages)
  }),

  http.post('/api/messaging/threads/:threadId/messages', async ({ params, request }) => {
    const body = (await request.json()) as {
      content: string
      attachments?: MessageAttachment[]
    }
    const newMessage = {
      id: `msg-${Date.now()}`,
      threadId: String(params.threadId),
      senderId: 'user-001',
      content: body.content,
      timestamp: new Date().toISOString(),
      attachments: body.attachments,
      read: true,
    }
    return HttpResponse.json(newMessage, { status: 201 })
  }),

  http.post('/api/messaging/threads', async ({ request }) => {
    const body = (await request.json()) as {
      subject: string
      participantIds: string[]
      entityContext?: { type: string; id: string; name: string }
    }
    const participants = teamMembers.filter((m) =>
      body.participantIds.includes(m.id),
    )
    const newThread = {
      id: `thread-${Date.now()}`,
      subject: body.subject,
      participants,
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      entityContext: body.entityContext,
    }
    return HttpResponse.json(newThread, { status: 201 })
  }),
]
