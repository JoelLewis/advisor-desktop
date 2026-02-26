---
name: gen-test
description: Use when adding tests to iDeal Desktop — covers Vitest setup, component testing with Testing Library, hook testing with TanStack Query wrapper, and MSW integration
---

# Test Generation for iDeal Desktop

## First-Time Setup

If Vitest is not yet installed, run:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add to `vite.config.ts`:
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

## Test File Conventions

| Source File | Test File |
|---|---|
| `src/hooks/use-documents.ts` | `src/hooks/__tests__/use-documents.test.ts` |
| `src/features/clients/ClientListPage.tsx` | `src/features/clients/__tests__/ClientListPage.test.tsx` |
| `src/components/ui/card.tsx` | `src/components/ui/__tests__/card.test.tsx` |
| `src/services/documents.ts` | `src/services/__tests__/documents.test.ts` |

Always use `__tests__/` subdirectory co-located with source.

## Test Patterns

### Hook Test (TanStack Query)

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { useClientDocuments } from '../use-documents'

const server = setupServer(
  http.get('/api/documents/clients/:clientId', () => {
    return HttpResponse.json([
      { id: 'doc-001', title: 'IPS', clientId: 'client-001' },
    ])
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useClientDocuments', () => {
  it('returns documents for a client', async () => {
    const { result } = renderHook(() => useClientDocuments('client-001'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].id).toBe('doc-001')
  })

  it('does not fetch when clientId is empty', () => {
    const { result } = renderHook(() => useClientDocuments(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})
```

### Component Test

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import ClientListPage from '../ClientListPage'

const server = setupServer(
  // Add handlers for data the component fetches
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ClientListPage', () => {
  it('renders client list', async () => {
    renderWithProviders(<ClientListPage />)
    expect(await screen.findByText('Clients')).toBeInTheDocument()
  })
})
```

### Service Test

```typescript
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { getClientDocuments } from '../documents'

const server = setupServer(
  http.get('/api/documents/clients/:clientId', () => {
    return HttpResponse.json([{ id: 'doc-001' }])
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('getClientDocuments', () => {
  it('fetches documents for client', async () => {
    const docs = await getClientDocuments('client-001')
    expect(docs).toHaveLength(1)
  })
})
```

## What to Test (Priority Order)

1. **Hooks** — query key correctness, `enabled` guards, mutation invalidation
2. **Services** — correct URL construction, parameter passing, error handling
3. **Pages** — renders without crashing, loading states, key interactions
4. **UI components** — props render correctly, event handlers fire

## What NOT to Test

- MSW handler internals (they're test infrastructure, not production code)
- Exact CSS classes or styling
- Third-party library internals (Recharts, D3, Radix)
- Implementation details (internal state, private functions)

## Running Tests

```bash
npm test              # Watch mode
npm run test:run      # Single run (CI)
npm run test:run -- --coverage  # With coverage report
```
