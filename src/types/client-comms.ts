export type CommChannel = 'email' | 'phone' | 'video' | 'in_person' | 'letter'
export type CommDirection = 'inbound' | 'outbound'

export type ClientComm = {
  id: string
  clientId: string
  clientName: string
  channel: CommChannel
  direction: CommDirection
  subject: string
  summary: string
  timestamp: string
  duration?: number
  aiGenerated?: boolean
  attachments?: string[]
}
