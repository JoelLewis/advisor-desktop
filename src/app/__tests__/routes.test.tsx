import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { routes, routerFuture, providerFuture } from '@/app/routes'
import { createTestQueryClient } from '@/test/render'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} future={providerFuture} />
    </QueryClientProvider>,
  )
}

async function renderKitReady() {
  const view = renderAt('/kit')
  await waitFor(() => expect(view.container.querySelector('[data-kit-ready="true"]')).not.toBeNull(), { timeout: 4000 })
  return view
}

describe('routes', () => {
  it.each(['/', '/no-such-page'])('%s renders exactly one h1', async (path) => {
    renderAt(path)
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
  it('/kit renders exactly one h1 once ready', async () => {
    await renderKitReady()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
  it('the kit is not ready while loading', () => {
    const { container } = renderAt('/kit')
    expect(container.querySelector('[data-kit-ready="true"]')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })
  it('the kit becomes ready on acc-002 data', async () => {
    await renderKitReady()
    const readings = screen.getByRole('heading', { name: 'Readings' }).closest('section')
    expect(readings).not.toBeNull()
    expect(within(readings as HTMLElement).getByText('Robert Johnson Individual')).toBeTruthy()
  })
  it('shows all three visibility bands', async () => {
    await renderKitReady()
    for (const w of ['Only you', "Firm only · client can't see", 'CLIENT CAN SEE']) {
      expect(screen.getAllByText(w).length).toBeGreaterThanOrEqual(2)
    }
  })
})
