---
name: new-feature
description: Use when scaffolding a new feature area in iDeal Desktop — creates types, mock data, MSW handler, service, hooks, and page following project conventions
---

# New Feature Scaffold

Scaffold all layers for a new feature following the established 6-layer data pipeline.

## Creation Order

**Always create in this order** (each layer depends on the previous):

1. **Types** → `src/types/<feature>.ts`
2. **Mock data** → `src/mocks/data/<feature>.ts`
3. **MSW handler** → `src/mocks/handlers/<feature>.ts`
4. **Service** → `src/services/<feature>.ts`
5. **Hooks** → `src/hooks/use-<feature>.ts`
6. **Page** → `src/features/<feature>/<FeatureName>Page.tsx`

Then register and route:
7. **Register handler** → add import + spread to `src/mocks/handlers/index.ts`
8. **Add route** → add lazy import + `<Route>` to `src/app/routes.tsx`

## Layer Templates

### 1. Types (`src/types/<feature>.ts`)

```typescript
export type FeatureItem = {
  id: string
  // domain fields...
  createdAt: string
  updatedAt: string
}
```

Rules:
- Use `type` not `interface`
- Use `as const` objects for enums (e.g., `export const STATUSES = { ... } as const`)
- Use discriminated unions for variant types
- IDs are always `string`
- Dates are ISO strings (`string`), not `Date`

### 2. Mock Data (`src/mocks/data/<feature>.ts`)

```typescript
import type { FeatureItem } from '@/types/feature'

export const featureItems: FeatureItem[] = [
  { id: 'feat-001', ... },
  { id: 'feat-002', ... },
]
```

Rules:
- Export named arrays/objects (not default exports)
- Use deterministic IDs with prefix (`feat-001`, `feat-002`)
- All data must be internally consistent (see CLAUDE.md Mock Data Consistency Rules)
- Reference existing client/account IDs from `src/mocks/data/clients.ts` and `src/mocks/data/accounts.ts`

### 3. MSW Handler (`src/mocks/handlers/<feature>.ts`)

```typescript
import { http, HttpResponse } from 'msw'
import { featureItems } from '../data/feature'

export const featureHandlers = [
  http.get('/api/feature', ({ request }) => {
    const url = new URL(request.url)
    // filtering from query params
    return HttpResponse.json(featureItems)
  }),

  http.get('/api/feature/:id', ({ params }) => {
    const item = featureItems.find((i) => i.id === params.id)
    if (!item) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.post('/api/feature', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 'feat-new', ...body }, { status: 201 })
  }),
]
```

Rules:
- Export named array: `export const featureHandlers = [...]`
- API prefix: always `/api/`
- Use `HttpResponse.json()` for responses
- Support filtering via URL search params on list endpoints
- Return 404 for missing items

### 4. Service (`src/services/<feature>.ts`)

```typescript
import { get, post } from './api-client'
import type { FeatureItem } from '@/types/feature'

export function getFeatureItems(params?: Record<string, string>) {
  return get<FeatureItem[]>('/feature', params)
}

export function getFeatureItem(id: string) {
  return get<FeatureItem>(`/feature/${id}`)
}

export function createFeatureItem(data: Omit<FeatureItem, 'id'>) {
  return post<FeatureItem>('/feature', data)
}
```

Rules:
- Import `get`/`post`/`put`/`del` from `./api-client`
- Thin wrappers — no business logic
- Explicit return types via generic
- Paths match handler routes (without `/api` prefix — api-client adds it)

### 5. Hooks (`src/hooks/use-<feature>.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFeatureItems, getFeatureItem, createFeatureItem } from '@/services/feature'

export function useFeatureItems(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['feature', params],
    queryFn: () => getFeatureItems(params),
  })
}

export function useFeatureItem(id: string) {
  return useQuery({
    queryKey: ['feature', id],
    queryFn: () => getFeatureItem(id),
    enabled: !!id,
  })
}

export function useCreateFeatureItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createFeatureItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feature'] }),
  })
}
```

Rules:
- Query keys: `['feature']` for lists, `['feature', id]` for detail, `['feature', params]` for filtered
- Always use `enabled: !!id` for detail queries with dynamic IDs
- Mutations invalidate the parent list query on success

### 6. Page (`src/features/<feature>/<FeatureName>Page.tsx`)

```typescript
import { useFeatureItems } from '@/hooks/use-feature'
import { Card } from '@/components/ui/card'

export default function FeatureNamePage() {
  const { data, isLoading } = useFeatureItems()

  if (isLoading) return <FeatureNameSkeleton />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
        Feature Name
      </h1>
      {/* content */}
    </div>
  )
}

function FeatureNameSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--surface-tertiary)]" />
      <Card className="h-64 animate-pulse bg-[var(--surface-tertiary)]" />
    </div>
  )
}
```

Rules:
- Default export (for React.lazy code splitting)
- Co-locate skeleton in same file
- Use CSS custom properties for colors (not Tailwind color classes)
- AI-generated content: purple left border (`border-l-[3px] border-[var(--accent-purple)]`)
- Monospace for numbers: `font-mono` class

### 7. Register Handler

In `src/mocks/handlers/index.ts`, add:
```typescript
import { featureHandlers } from './feature'
// ... in the handlers array:
...featureHandlers,
```

### 8. Add Route

In `src/app/routes.tsx`, add:
```typescript
const FeatureNamePage = lazy(() => import('@/features/feature/FeatureNamePage'))
// ... in the route tree:
<Route path="feature" element={<Suspense fallback={<PageSkeleton />}><FeatureNamePage /></Suspense>} />
```

## Checklist

After scaffolding, verify:
- [ ] Types use `type` not `interface`, no `any`
- [ ] Mock data IDs are deterministic and prefixed
- [ ] Handler registered in `index.ts`
- [ ] Service paths match handler routes
- [ ] Hook query keys are consistent
- [ ] Page has skeleton loading state
- [ ] Route added with lazy + Suspense
- [ ] `npm run type-check` passes
