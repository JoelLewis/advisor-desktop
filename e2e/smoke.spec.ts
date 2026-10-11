import { test, expect } from '@playwright/test'

test('home renders its heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Advisor Desktop')
})

test('unknown routes render not found', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
})
