import { test, expect } from '@playwright/test'

const topLevelRoutes = [
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/clients', title: 'Clients' },
  { path: '/households', title: 'Households' },
  { path: '/portfolios', title: 'Portfolios' },
  { path: '/growth', title: 'Prospects' },
  { path: '/growth/revenue', title: 'Revenue' },
  { path: '/workflows', title: 'Workflows' },
  { path: '/settings', title: 'Settings' },
  { path: '/portfolios/trading', title: 'Trading' },
]

test.describe('Smoke tests — all top-level routes render', () => {
  for (const route of topLevelRoutes) {
    test(`${route.path} loads without errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto(route.path)
      // Wait for lazy-loaded content to appear (Suspense boundary resolves)
      await expect(page.locator('[data-testid="app-shell"], main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })

      expect(errors).toEqual([])
    })
  }
})
