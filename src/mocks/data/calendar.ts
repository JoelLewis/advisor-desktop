import type { CalendarEvent } from '@/types/calendar'

/**
 * The advisor's calendar around the frozen today (Wednesday 2026-02-25), in Eastern Time with the
 * offset stated (UTC−5 until daylight time starts on 2026-03-08), so every time parses to one instant.
 * Phase 5 · the Johnson annual review is this afternoon, between the Patel call and the Foster
 * meeting; no event falls on a weekend.
 */
export const calendarEvents: CalendarEvent[] = [
  // Today — Wed Feb 25
  {
    id: 'evt-001', title: 'Morning Portfolio Review', meetingType: 'internal',
    startTime: '2026-02-25T08:30:00-05:00', endTime: '2026-02-25T09:00:00-05:00',
    location: 'Conference Room A', prepCompleted: true, attendees: ['user-001', 'user-002', 'user-003'],
  },
  {
    id: 'evt-002', title: 'Quarterly Review — Anderson Household',
    clientId: 'cli-009', clientName: 'Richard Anderson', householdId: 'hh-006', meetingType: 'quarterly_review',
    startTime: '2026-02-25T10:00:00-05:00', endTime: '2026-02-25T11:00:00-05:00',
    location: 'Office — Main', notes: 'Discuss duration mismatch, wire documentation', prepCompleted: false, attendees: ['cli-009', 'user-001'],
  },
  {
    id: 'evt-003', title: 'Planning Call — Raj & Priya Patel',
    clientId: 'cli-011', clientName: 'Raj Patel', householdId: 'hh-007', meetingType: 'planning',
    startTime: '2026-02-25T13:00:00-05:00', endTime: '2026-02-25T14:00:00-05:00',
    location: 'Zoom', notes: 'New baby planning: 529, beneficiaries, insurance', prepCompleted: false, attendees: ['cli-011', 'user-001'],
  },
  {
    id: 'evt-010', title: 'Annual Review — Johnson Household',
    clientId: 'cli-001', clientName: 'Robert Johnson', householdId: 'hh-001', meetingType: 'annual_review',
    startTime: '2026-02-25T14:00:00-05:00', endTime: '2026-02-25T15:15:00-05:00',
    location: 'Office — Main', notes: 'Annual review: portfolio, plan, IPS, open items', prepCompleted: false,
    attendees: ['cli-001', 'cli-002', 'user-001'],
  },
  {
    id: 'evt-004', title: 'Prospect Meeting — Dr. Amanda Foster',
    meetingType: 'prospect',
    startTime: '2026-02-25T15:30:00-05:00', endTime: '2026-02-25T16:30:00-05:00',
    location: 'Coffee — Blue Bottle (Referral from James Thompson)', prepCompleted: false, attendees: ['user-001'],
  },
  // Thu Feb 26
  {
    id: 'evt-005', title: 'Team Standup', meetingType: 'internal',
    startTime: '2026-02-26T09:00:00-05:00', endTime: '2026-02-26T09:30:00-05:00',
    location: 'Conference Room B', prepCompleted: false, attendees: ['user-001', 'user-002', 'user-003'],
  },
  {
    id: 'evt-006', title: 'Semi-Annual Review — Williams Household',
    clientId: 'cli-004', clientName: 'David Williams', householdId: 'hh-003', meetingType: 'quarterly_review',
    startTime: '2026-02-26T11:00:00-05:00', endTime: '2026-02-26T12:00:00-05:00',
    location: 'Office — Main', notes: 'Discuss consolidation of Fidelity 401(k)', prepCompleted: false, attendees: ['cli-004', 'user-001'],
  },
  {
    id: 'evt-007', title: 'RMD Strategy — James Thompson',
    clientId: 'cli-008', clientName: 'James Thompson', householdId: 'hh-005', meetingType: 'planning',
    startTime: '2026-02-26T14:00:00-05:00', endTime: '2026-02-26T15:00:00-05:00',
    location: 'Zoom', notes: 'First RMD strategy; Roth conversion discussion', prepCompleted: false, attendees: ['cli-008', 'user-001'],
  },
  // Fri Feb 27
  {
    id: 'evt-008', title: 'Compliance Training', meetingType: 'internal',
    startTime: '2026-02-27T10:00:00-05:00', endTime: '2026-02-27T11:30:00-05:00',
    location: 'Large Conference Room', prepCompleted: false, attendees: ['user-001', 'user-002', 'user-003', 'cco-001'],
  },
  {
    id: 'evt-009', title: 'Portfolio Review — Margaret Chen',
    clientId: 'cli-003', clientName: 'Margaret Chen', householdId: 'hh-002', meetingType: 'quarterly_review',
    startTime: '2026-02-27T14:00:00-05:00', endTime: '2026-02-27T15:00:00-05:00',
    location: 'Zoom', notes: 'AAPL concentration, wash sale window, ESG interest', prepCompleted: false, attendees: ['cli-003', 'user-001'],
  },
  // Mon Mar 2 — Michael Martinez's birthday is 7 December (nba-009), so this is a check-in, not a birthday call.
  {
    id: 'evt-011', title: 'Check-in Call — Michael Martinez',
    clientId: 'cli-006', clientName: 'Michael Martinez', householdId: 'hh-004', meetingType: 'ad_hoc',
    startTime: '2026-03-02T09:00:00-05:00', endTime: '2026-03-02T09:15:00-05:00',
    notes: 'Quarterly check-in call', prepCompleted: false, attendees: ['cli-006', 'user-001'],
  },
  // Tue Mar 3
  {
    id: 'evt-012', title: 'Ad Hoc — O\'Brien 529 Rebalance Discussion',
    clientId: 'cli-013', clientName: "Brian O'Brien", householdId: 'hh-008', meetingType: 'ad_hoc',
    startTime: '2026-03-03T11:00:00-05:00', endTime: '2026-03-03T11:30:00-05:00',
    location: 'Phone', notes: '529 rebalance overdue, quick call', prepCompleted: false, attendees: ['cli-013', 'user-001'],
  },
  // Thu Mar 5
  {
    id: 'evt-013', title: 'Quarterly Review — Anderson Household (Follow-up)',
    clientId: 'cli-009', clientName: 'Richard Anderson', householdId: 'hh-006', meetingType: 'quarterly_review',
    startTime: '2026-03-05T10:00:00-05:00', endTime: '2026-03-05T11:00:00-05:00',
    location: 'Office — Main', notes: 'Follow-up from Feb 25 meeting', prepCompleted: false, attendees: ['cli-009', 'user-001'],
  },
]
