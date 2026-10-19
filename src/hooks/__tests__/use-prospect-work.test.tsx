import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useDeliverDisclosure, usePartySteps, useProspect, useRecordCoffee } from '@/hooks/use-prospect-work'

it('a delivery and the coffee refresh her record and her steps', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  const { result } = renderHook(() => ({
    prospect: useProspect('prsp-011'), steps: usePartySteps('prsp-011'), deliver: useDeliverDisclosure('prsp-011'), coffee: useRecordCoffee('prsp-011'),
  }), { wrapper })
  await waitFor(() => expect(result.current.prospect.data?.formCrsDelivered).toBe(false))
  await act(() => result.current.deliver.mutateAsync('form_crs'))
  await waitFor(() => expect(result.current.prospect.data?.formCrsDelivered).toBe(true))
  await act(() => result.current.coffee.mutateAsync('Coffee after the introduction.'))
  await waitFor(() => expect(result.current.steps.data?.questionnaire).toBe('open'))
})
