import { it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { resolveViewer } from '@/workspace/viewer/viewer-context'
import { createTestQueryClient } from '@/test/render'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
)

it('defaults to the advisor and switches', () => {
  const { result } = renderHook(() => useViewer(), { wrapper })
  expect(result.current.viewerId).toBe('user-001')
  act(() => result.current.setViewerId('cli-001'))
  expect(result.current.viewerId).toBe('cli-001')
})

it('restores a stored viewer the directory knows', async () => {
  sessionStorage.setItem('ws-viewer', 'cco-001')
  const { result } = renderHook(() => useViewer(), { wrapper })
  await waitFor(() => expect(result.current?.viewerId).toBe('cco-001'))
})

it('a stored viewer the directory does not know falls back to the advisor', async () => {
  sessionStorage.setItem('ws-viewer', 'user-999')
  const { result } = renderHook(() => useViewer(), { wrapper })
  await waitFor(() => expect(result.current?.viewerId).toBe('user-001'))
})

it('resolves a viewer only against the people in the directory', () => {
  const directory = { people: [{ id: 'cli-001', name: 'Robert Johnson', role: 'client' as const }], agents: [], permissions: {} }
  expect(resolveViewer('cli-001', directory)).toBe('cli-001')
  expect(resolveViewer('user-999', directory)).toBe('user-001')
  expect(resolveViewer('user-999', undefined)).toBe('user-999')
})
