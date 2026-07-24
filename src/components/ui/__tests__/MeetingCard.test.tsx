import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MeetingCard } from '../MeetingCard'
import type { CalendarEvent } from '@/types/calendar'

// Regression test for fix round 1: isPast previously compared the mock event's endTime against
// `new Date()` (the live system clock). Since fixture events are dated around the frozen clock
// (2026-02-25), that comparison would mislabel every mock meeting as "past" whenever the real
// wall-clock date drifted away from February 2026 — exactly the "four different todays" bug this
// phase closes. isPast must be evaluated against src/lib/clock's frozen now() instead.
function createTestEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-test-001',
    title: 'Portfolio Review',
    meetingType: 'quarterly_review',
    startTime: '2026-02-25T14:00:00Z',
    endTime: '2026-02-25T15:00:00Z',
    prepCompleted: false,
    ...overrides,
  }
}

describe('MeetingCard', () => {
  it('does not mark an event ending after the frozen clock as past', () => {
    const { container } = render(
      <MeetingCard event={createTestEvent({ endTime: '2026-02-25T15:00:00Z' })} />,
    )
    // MOCK_NOW_ISO is 2026-02-25T12:00:00Z — 15:00 on the same day is still in the future.
    expect(container.firstElementChild).not.toHaveClass('opacity-60')
  })

  it('marks an event ending before the frozen clock as past', () => {
    const { container } = render(
      <MeetingCard event={createTestEvent({ endTime: '2026-02-25T09:00:00Z' })} />,
    )
    expect(container.firstElementChild).toHaveClass('opacity-60')
  })
})
