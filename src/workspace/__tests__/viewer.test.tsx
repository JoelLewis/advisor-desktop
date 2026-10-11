import { it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useViewer } from '@/workspace/viewer/use-viewer'

it('defaults to the advisor and switches', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <ViewerProvider>{children}</ViewerProvider>
  const { result } = renderHook(() => useViewer(), { wrapper })
  expect(result.current.viewerId).toBe('user-001')
  act(() => result.current.setViewerId('cli-001'))
  expect(result.current.viewerId).toBe('cli-001')
})
