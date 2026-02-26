import type { CalendarEvent } from '@/types/calendar'

// Generate events around "today" (2026-02-25)
export const calendarEvents: CalendarEvent[] = [
  // Today — Feb 25
  {
    id: 'evt-001', title: 'Morning Portfolio Review', meetingType: 'internal',
    startTime: '2026-02-25T08:30:00', endTime: '2026-02-25T09:00:00',
    location: 'Conference Room A', prepCompleted: true,
  },
  {
    id: 'evt-002', title: 'Quarterly Review — Anderson Household',
    clientId: 'cli-009', clientName: 'Richard Anderson', meetingType: 'quarterly_review',
    startTime: '2026-02-25T10:00:00', endTime: '2026-02-25T11:00:00',
    location: 'Office — Main', notes: 'Discuss duration mismatch, wire documentation', prepCompleted: false,
  },
  {
    id: 'evt-003', title: 'Planning Call — Raj & Priya Patel',
    clientId: 'cli-011', clientName: 'Raj Patel', meetingType: 'planning',
    startTime: '2026-02-25T13:00:00', endTime: '2026-02-25T14:00:00',
    location: 'Zoom', notes: 'New baby planning: 529, beneficiaries, insurance', prepCompleted: false,
  },
  {
    id: 'evt-004', title: 'Prospect Meeting — Dr. Amanda Foster',
    meetingType: 'prospect',
    startTime: '2026-02-25T15:30:00', endTime: '2026-02-25T16:30:00',
    location: 'Coffee — Blue Bottle (Referral from James Thompson)', prepCompleted: false,
  },
  // Tomorrow — Feb 26
  {
    id: 'evt-005', title: 'Team Standup', meetingType: 'internal',
    startTime: '2026-02-26T09:00:00', endTime: '2026-02-26T09:30:00',
    location: 'Conference Room B', prepCompleted: false,
  },
  {
    id: 'evt-006', title: 'Semi-Annual Review — Williams Household',
    clientId: 'cli-004', clientName: 'David Williams', meetingType: 'quarterly_review',
    startTime: '2026-02-26T11:00:00', endTime: '2026-02-26T12:00:00',
    location: 'Office — Main', notes: 'Discuss consolidation of Fidelity 401(k)', prepCompleted: false,
  },
  {
    id: 'evt-007', title: 'RMD Strategy — James Thompson',
    clientId: 'cli-008', clientName: 'James Thompson', meetingType: 'planning',
    startTime: '2026-02-26T14:00:00', endTime: '2026-02-26T15:00:00',
    location: 'Zoom', notes: 'First RMD strategy; Roth conversion discussion', prepCompleted: false,
  },
  // Feb 27
  {
    id: 'evt-008', title: 'Compliance Training', meetingType: 'internal',
    startTime: '2026-02-27T10:00:00', endTime: '2026-02-27T11:30:00',
    location: 'Large Conference Room', prepCompleted: false,
  },
  {
    id: 'evt-009', title: 'Portfolio Review — Margaret Chen',
    clientId: 'cli-003', clientName: 'Margaret Chen', meetingType: 'quarterly_review',
    startTime: '2026-02-27T14:00:00', endTime: '2026-02-27T15:00:00',
    location: 'Zoom', notes: 'AAPL concentration, wash sale window, ESG interest', prepCompleted: false,
  },
  // Mar 1 (next week)
  {
    id: 'evt-010', title: 'IPS Review — Johnson Household',
    clientId: 'cli-001', clientName: 'Robert Johnson', meetingType: 'annual_review',
    startTime: '2026-03-01T10:00:00', endTime: '2026-03-01T11:30:00',
    location: 'Office — Main', notes: 'IPS overdue; full portfolio and planning review', prepCompleted: false,
  },
  {
    id: 'evt-011', title: "Birthday Call — Michael Martinez",
    clientId: 'cli-006', clientName: 'Michael Martinez', meetingType: 'ad_hoc',
    startTime: '2026-03-01T09:00:00', endTime: '2026-03-01T09:15:00',
    notes: 'Birthday on Mar 1 — personal call', prepCompleted: false,
  },
  // Mar 3
  {
    id: 'evt-012', title: 'Ad Hoc — O\'Brien 529 Rebalance Discussion',
    clientId: 'cli-013', clientName: "Brian O'Brien", meetingType: 'ad_hoc',
    startTime: '2026-03-03T11:00:00', endTime: '2026-03-03T11:30:00',
    location: 'Phone', notes: '529 rebalance overdue, quick call', prepCompleted: false,
  },
  // Mar 5
  {
    id: 'evt-013', title: 'Quarterly Review — Anderson Household (Follow-up)',
    clientId: 'cli-009', clientName: 'Richard Anderson', meetingType: 'quarterly_review',
    startTime: '2026-03-05T10:00:00', endTime: '2026-03-05T11:00:00',
    location: 'Office — Main', notes: 'Follow-up from Feb 25 meeting', prepCompleted: false,
  },
]
