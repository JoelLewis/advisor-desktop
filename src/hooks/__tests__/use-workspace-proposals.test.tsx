import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useCreateProposal, useProposal, useProposals, useReviseProposal } from '@/hooks/use-workspace'

it('a revision from one pane refreshes every query that reads the proposal', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => ({
    list: useProposals('th-johnson-review'),
    one: useProposal('prop-0001'),
    create: useCreateProposal('th-johnson-review'),
    revise: useReviseProposal('prop-0001'),
  }), { wrapper })
  await waitFor(() => expect(result.current.list.data).toEqual([]))
  await act(() => result.current.create.mutateAsync('acc-002'))
  await waitFor(() => expect(result.current.list.data?.map((p) => p.id)).toEqual(['prop-0001']))
  await waitFor(() => expect(result.current.one.data?.versions).toHaveLength(1))
  await act(() => result.current.revise.mutateAsync([{ kind: 'harvest_only' }]))
  await waitFor(() => expect(result.current.one.data?.versions).toHaveLength(2))
  await waitFor(() => expect(result.current.list.data?.[0]?.versions).toHaveLength(2))
  expect(client.getQueryData(['workspace', 'user-001', 'proposal', 'prop-0001'])).toBeDefined()
  expect(client.getQueryData(['workspace', 'user-001', 'proposals', 'th-johnson-review'])).toBeDefined()
})

it('a mutation marks every viewer\'s workspace queries stale, refused or not', async () => {
  const client = createTestQueryClient()
  client.setQueryData(['workspace', 'cco-001', 'proposals', 'all'], [])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => useReviseProposal('prop-9999'), { wrapper })
  let refused = false
  await act(() => result.current.mutateAsync([{ kind: 'harvest_only' }]).catch(() => { refused = true }))
  expect(refused).toBe(true)
  await waitFor(() => expect(client.getQueryState(['workspace', 'cco-001', 'proposals', 'all'])?.isInvalidated).toBe(true))
})
