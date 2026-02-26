import type { Participant, Thread, Message } from '@/types/messaging'

const joel: Participant = { id: 'user-001', name: 'Joel Lewis', role: 'advisor' }
const sarah: Participant = { id: 'user-002', name: 'Sarah Mitchell', role: 'csa' }
const mike: Participant = { id: 'user-003', name: 'Mike Chen', role: 'analyst' }
const lisa: Participant = { id: 'user-004', name: 'Lisa Park', role: 'compliance' }
const ada: Participant = { id: 'user-005', name: 'Ada', role: 'ai_agent' }

export const teamMembers: Participant[] = [joel, sarah, mike, lisa, ada]

export const threads: Thread[] = [
  {
    id: 'thread-001',
    subject: 'Johnson Rebalance Review',
    participants: [joel, sarah, mike],
    lastMessage: 'I ran the drift analysis — large-cap growth is 3.2% over target. Recommend trimming AAPL and MSFT to fund the fixed income sleeve.',
    lastMessageAt: '2026-02-25T10:45:00Z',
    unreadCount: 2,
    entityContext: { type: 'client', id: 'cli-001', name: 'Robert Johnson' },
  },
  {
    id: 'thread-002',
    subject: 'Chen Trust Tax Strategy',
    participants: [joel, mike, ada],
    lastMessage: 'Ada identified three additional TLH candidates in the Chen trust. Net estimated savings: $14,200. Details attached.',
    lastMessageAt: '2026-02-24T16:30:00Z',
    unreadCount: 1,
    entityContext: { type: 'account', id: 'acc-006', name: 'Chen Family Trust' },
  },
  {
    id: 'thread-003',
    subject: 'Q1 Performance Review',
    participants: [joel, sarah, mike, ada],
    lastMessage: 'Draft review decks are ready for the top 10 households. I flagged two accounts where TWR lags benchmark by more than 200bps.',
    lastMessageAt: '2026-02-24T14:00:00Z',
    unreadCount: 0,
  },
  {
    id: 'thread-004',
    subject: 'New Client Onboarding - Williams',
    participants: [joel, sarah, lisa],
    lastMessage: 'Suitability questionnaire received and approved. We can proceed with account opening once the IPS is signed.',
    lastMessageAt: '2026-02-23T11:15:00Z',
    unreadCount: 0,
    entityContext: { type: 'client', id: 'cli-004', name: 'David Williams' },
  },
  {
    id: 'thread-005',
    subject: 'Compliance Alert: Anderson Account',
    participants: [joel, lisa, ada],
    lastMessage: 'Source-of-funds documentation cleared. No further action required on the $250K wire.',
    lastMessageAt: '2026-02-24T17:00:00Z',
    unreadCount: 3,
    entityContext: { type: 'client', id: 'cli-009', name: 'Richard Anderson' },
  },
]

export const threadMessages: Record<string, Message[]> = {
  'thread-001': [
    {
      id: 'msg-001',
      threadId: 'thread-001',
      senderId: 'user-001',
      content: 'Team, the Johnson household is overdue for a rebalance. Can someone pull the current drift numbers?',
      timestamp: '2026-02-25T09:00:00Z',
      read: true,
    },
    {
      id: 'msg-002',
      threadId: 'thread-001',
      senderId: 'user-002',
      content: 'On it. The last rebalance was November — I\'ll pull positions from PMS and compare against the IPS targets.',
      timestamp: '2026-02-25T09:15:00Z',
      read: true,
    },
    {
      id: 'msg-003',
      threadId: 'thread-001',
      senderId: 'user-003',
      content: 'I ran the drift analysis — large-cap growth is 3.2% over target. Recommend trimming AAPL and MSFT to fund the fixed income sleeve.',
      timestamp: '2026-02-25T10:45:00Z',
      attachments: [
        { type: 'account_card', entityId: 'acc-001', entityName: 'Johnson Family Trust', preview: 'Drift: +3.2% large-cap growth' },
      ],
      read: false,
    },
  ],
  'thread-002': [
    {
      id: 'msg-004',
      threadId: 'thread-002',
      senderId: 'user-001',
      content: 'We executed TLH on the Chen trust last week. Are there any remaining opportunities before quarter-end?',
      timestamp: '2026-02-24T14:00:00Z',
      read: true,
    },
    {
      id: 'msg-005',
      threadId: 'thread-002',
      senderId: 'user-003',
      content: 'Let me check the unrealized loss report. Give me an hour.',
      timestamp: '2026-02-24T14:20:00Z',
      read: true,
    },
    {
      id: 'msg-006',
      threadId: 'thread-002',
      senderId: 'user-003',
      content: 'Found a couple positions with short-term losses. Sending to Ada for wash-sale rule validation.',
      timestamp: '2026-02-24T15:45:00Z',
      read: true,
    },
    {
      id: 'msg-007',
      threadId: 'thread-002',
      senderId: 'user-005',
      content: 'Ada identified three additional TLH candidates in the Chen trust. Net estimated savings: $14,200. Details attached.',
      timestamp: '2026-02-24T16:30:00Z',
      attachments: [
        { type: 'document', entityId: 'doc-007', entityName: 'TLH Analysis — Chen Trust', preview: '3 candidates, $14.2K estimated savings' },
      ],
      read: false,
    },
  ],
  'thread-003': [
    {
      id: 'msg-008',
      threadId: 'thread-003',
      senderId: 'user-001',
      content: 'Q1 is wrapping up. Can we get performance review decks started for the top households? Prioritize platinum and gold tiers.',
      timestamp: '2026-02-24T09:00:00Z',
      read: true,
    },
    {
      id: 'msg-009',
      threadId: 'thread-003',
      senderId: 'user-005',
      content: 'I\'ve generated draft performance summaries for all platinum households. TWR calculations are current through yesterday\'s close.',
      timestamp: '2026-02-24T11:30:00Z',
      read: true,
    },
    {
      id: 'msg-010',
      threadId: 'thread-003',
      senderId: 'user-002',
      content: 'Thanks Ada. I\'ll review and schedule the client meetings. Joel, any households you want to handle personally?',
      timestamp: '2026-02-24T12:00:00Z',
      read: true,
    },
    {
      id: 'msg-011',
      threadId: 'thread-003',
      senderId: 'user-003',
      content: 'Draft review decks are ready for the top 10 households. I flagged two accounts where TWR lags benchmark by more than 200bps.',
      timestamp: '2026-02-24T14:00:00Z',
      attachments: [
        { type: 'client_card', entityId: 'cli-006', entityName: 'Michael Martinez', preview: 'TWR: -2.4% vs benchmark' },
        { type: 'client_card', entityId: 'cli-011', entityName: 'Raj Patel', preview: 'TWR: -2.1% vs benchmark' },
      ],
      read: true,
    },
  ],
  'thread-004': [
    {
      id: 'msg-012',
      threadId: 'thread-004',
      senderId: 'user-001',
      content: 'David Williams is ready to proceed with the 401(k) rollover. Sarah, can you handle the ACAT paperwork? Lisa, we\'ll need a suitability sign-off.',
      timestamp: '2026-02-22T10:00:00Z',
      read: true,
    },
    {
      id: 'msg-013',
      threadId: 'thread-004',
      senderId: 'user-002',
      content: 'ACAT form prepared. I\'ll need David\'s most recent Fidelity statement. Sending him a secure upload link now.',
      timestamp: '2026-02-22T14:30:00Z',
      attachments: [
        { type: 'nba_card', entityId: 'nba-004', entityName: '401(k) Rollover — Williams', preview: '$380K from Fidelity' },
      ],
      read: true,
    },
    {
      id: 'msg-014',
      threadId: 'thread-004',
      senderId: 'user-004',
      content: 'Suitability questionnaire received and approved. We can proceed with account opening once the IPS is signed.',
      timestamp: '2026-02-23T11:15:00Z',
      read: true,
    },
  ],
  'thread-005': [
    {
      id: 'msg-015',
      threadId: 'thread-005',
      senderId: 'user-005',
      content: 'Compliance alert: A $250,000 incoming wire was received in the Anderson joint account. Source-of-funds documentation is required per AML policy.',
      timestamp: '2026-02-24T14:00:00Z',
      attachments: [
        { type: 'account_card', entityId: 'acc-022', entityName: 'Anderson Joint Brokerage', preview: '$250K incoming wire' },
      ],
      read: false,
    },
    {
      id: 'msg-016',
      threadId: 'thread-005',
      senderId: 'user-001',
      content: 'Richard mentioned this is from a property sale. Lisa, what documentation do we need?',
      timestamp: '2026-02-24T14:30:00Z',
      read: false,
    },
    {
      id: 'msg-017',
      threadId: 'thread-005',
      senderId: 'user-004',
      content: 'We need the closing statement from the real estate transaction and a signed source-of-funds declaration. I\'ll send the template to Richard directly.',
      timestamp: '2026-02-24T15:00:00Z',
      read: false,
    },
    {
      id: 'msg-018',
      threadId: 'thread-005',
      senderId: 'user-004',
      content: 'Source-of-funds documentation cleared. No further action required on the $250K wire.',
      timestamp: '2026-02-24T17:00:00Z',
      attachments: [
        { type: 'document', entityId: 'doc-016', entityName: 'Anderson SOF Declaration', preview: 'Cleared — property sale proceeds' },
      ],
      read: false,
    },
  ],
}
