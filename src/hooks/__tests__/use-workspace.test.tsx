import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { useThreads } from '@/hooks/use-workspace'

it('switching viewer refetches and never shows the previous viewer\'s threads', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => ({ v: useViewer(), t: useThreads() }), { wrapper })
  await waitFor(() => expect(result.current.t.data?.length).toBe(6))
  act(() => result.current.v.setViewerId('cli-001'))
  await waitFor(() => expect(result.current.t.data?.map((t) => t.id)).toEqual(['th-robert']))
  expect(client.getQueryData(['workspace', 'cli-001', 'threads'])).toBeDefined()
})
