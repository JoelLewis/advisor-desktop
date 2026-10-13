import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useHoldMeeting, useHousehold, useMeeting, useMeetings } from '@/hooks/use-meetings'

it('holding the meeting refreshes the meeting, the list and the household it belongs to', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => ({
    meeting: useMeeting('evt-010'), meetings: useMeetings(), household: useHousehold('hh-001'), hold: useHoldMeeting('evt-010'),
  }), { wrapper })
  await waitFor(() => expect(result.current.meeting.data?.state).toBe('scheduled'))
  await waitFor(() => expect(result.current.household.data?.meetings.upcoming).toHaveLength(1))
  await act(() => result.current.hold.mutateAsync())
  await waitFor(() => expect(result.current.meeting.data?.state).toBe('held'))
  await waitFor(() => expect(result.current.meetings.data?.[0]?.state).toBe('held'))
  await waitFor(() => expect(result.current.household.data?.meetings.past).toHaveLength(1))
})
