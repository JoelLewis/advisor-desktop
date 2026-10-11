import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { routes } from '@/app/routes'
import { createTestQueryClient } from '@/test/render'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<QueryClientProvider client={createTestQueryClient()}><RouterProvider router={router} /></QueryClientProvider>)
}

describe('routes', () => {
  it.each(['/', '/kit', '/no-such-page'])('%s renders exactly one h1', async (path) => {
    renderAt(path)
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
  it('the kit becomes ready on acc-002 data', async () => {
    const { container } = renderAt('/kit')
    expect(container.querySelector('[data-kit-ready="true"]')).toBeNull()
    await screen.findByText('Robert Johnson Individual', {}, { timeout: 5000 })
    expect(container.querySelector('[data-kit-ready="true"]')).not.toBeNull()
  })
  it('shows all three visibility bands', async () => {
    renderAt('/kit')
    for (const w of ['Only you', "Firm only · client can't see", 'CLIENT CAN SEE']) {
      expect((await screen.findAllByText(w)).length).toBeGreaterThanOrEqual(2)
    }
  })
})
