import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useReconciliation, useResolveBreak } from '@/hooks/use-reference'

it('a resolve refreshes the reconciliation view', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  const { result } = renderHook(() => ({ view: useReconciliation(), resolve: useResolveBreak() }), { wrapper })
  await waitFor(() => expect(result.current.view.data?.summary.openBreaks).toBe(1))
  const brk = result.current.view.data?.breaks.find((b) => b.id === 'brk-002')
  if (!brk) throw new Error('brk-002 is listed')
  await act(() => result.current.resolve.mutateAsync({ breakId: brk.id, fingerprint: brk.fingerprint, resolution: 'book_corrected', rationale: 'Corrected.' }))
  await waitFor(() => expect(result.current.view.data?.summary.openBreaks).toBe(0))
})
