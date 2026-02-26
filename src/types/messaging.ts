type Participant = {
  id: string
  name: string
  role: 'advisor' | 'csa' | 'analyst' | 'compliance' | 'ai_agent'
  avatar?: string
}

type MessageAttachment = {
  type: 'client_card' | 'account_card' | 'nba_card' | 'document' | 'link'
  entityId: string
  entityName: string
  preview?: string
}

type Message = {
  id: string
  threadId: string
  senderId: string
  content: string
  timestamp: string
  attachments?: MessageAttachment[]
  read: boolean
}

type Thread = {
  id: string
  subject: string
  participants: Participant[]
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  entityContext?: {
    type: string
    id: string
    name: string
  }
}

export type { Participant, MessageAttachment, Message, Thread }
