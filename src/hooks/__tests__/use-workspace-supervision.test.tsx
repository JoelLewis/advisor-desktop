import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useActAsCco, useSupervision } from '@/hooks/use-workspace'
import { approveProposal, createProposal } from '@/services/workspace'

it('the shortcut refreshes the queue and marks every query stale, accounts and positions included', async () => {
  const detail = await createProposal('user-001', 'th-johnson-review', 'acc-002')
  await approveProposal('user-001', detail.id, 1, detail.versions[0]!.fingerprint)
  const client = createTestQueryClient()
  // Unobserved queries are collected at once under the test client's gcTime of 0; keep these so their state can be read.
  client.setQueryDefaults(['positions'], { gcTime: Infinity })
  client.setQueryDefaults(['account'], { gcTime: Infinity })
  client.setQueryData(['positions', 'acc-002'], [])
  client.setQueryData(['account', 'acc-002'], {})
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => ({ queue: useSupervision(), shortcut: useActAsCco() }), { wrapper })
  await waitFor(() => expect(result.current.queue.data?.orders).toHaveLength(1))
  await act(() => result.current.shortcut.mutateAsync({ kind: 'orders', id: detail.id }))
  await waitFor(() => expect(result.current.queue.data?.orders).toEqual([]))
  expect(client.getQueryState(['positions', 'acc-002'])?.isInvalidated).toBe(true)
  expect(client.getQueryState(['account', 'acc-002'])?.isInvalidated).toBe(true)
})
