import { it, expect } from 'vitest'
import { renderHook, act, waitFor, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { resolveViewer } from '@/workspace/viewer/viewer-context'
import { createTestQueryClient, renderRoutes } from '@/test/render'

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

it('switching to Robert on Billing goes home and says why, on the page and in the announcer', async () => {
  const { router } = renderRoutes(routes, '/billing')
  await screen.findByRole('heading', { level: 1, name: 'Billing' })
  const user = userEvent.setup()
  await screen.findByRole('option', { name: 'Robert Johnson · Client' })
  await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(await screen.findByText("Robert Johnson can't see Billing; showing the workspace.")).toBeInTheDocument()
  await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent("Robert Johnson can't see Billing; showing the workspace."))
})

it("switching to a client never leaves the firm page's name on the tab", async () => {
  renderRoutes(routes, '/billing')
  await screen.findByRole('heading', { level: 1, name: 'Billing' })
  await waitFor(() => expect(document.title).toBe('Billing · Advisor Desktop'))
  const user = userEvent.setup()
  await screen.findByRole('option', { name: 'Robert Johnson · Client' })
  const titles: string[] = []
  const watch = new MutationObserver(() => titles.push(document.title))
  watch.observe(document.head, { childList: true, subtree: true, characterData: true })
  await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
  await waitFor(() => expect(document.title).toBe('Workspace · Advisor Desktop'))
  watch.disconnect()
  expect(titles).not.toContain('Billing · Advisor Desktop')
})

const REDIRECT_NOTE = "Robert Johnson can't see Billing; showing the workspace."

async function redirectedHomeFromBilling() {
  const harness = renderRoutes(routes, '/billing')
  await screen.findByRole('heading', { level: 1, name: 'Billing' })
  const user = userEvent.setup()
  await screen.findByRole('option', { name: 'Robert Johnson · Client' })
  await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
  expect(await screen.findByText(REDIRECT_NOTE)).toBeInTheDocument()
  return { ...harness, user }
}

it('a second switch while on home does not rename the note to a viewer who never left the page', async () => {
  const { user } = await redirectedHomeFromBilling()
  await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Mark Davis · Compliance')
  await waitFor(() => expect(screen.queryByText(REDIRECT_NOTE)).toBeNull())
  expect(screen.queryByText(/can't see Billing/)).toBeNull()
})

it('a reload or Back does not show or announce the redirect again', async () => {
  const { router } = await redirectedHomeFromBilling()
  await waitFor(() => expect(router.state.location.state).toBeNull())
  await act(() => router.navigate('/t/th-brief'))
  await act(() => router.navigate(-1))
  await screen.findByRole('heading', { level: 1, name: 'Workspace' })
  expect(within(screen.getByRole('main')).queryByText(REDIRECT_NOTE)).toBeNull()
})
