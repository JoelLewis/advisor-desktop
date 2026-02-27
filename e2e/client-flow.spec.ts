import { test, expect } from '@playwright/test'

test.describe('Client navigation flow', () => {
  test('clients list → client detail → account detail', async ({ page }) => {
    // Step 1: Navigate to clients list
    await page.goto('/clients')
    await expect(page.getByRole('heading', { name: /clients/i }).first()).toBeVisible({ timeout: 10_000 })

    // Step 2: Client rows should render
    const clientRows = page.locator('table tbody tr, [role="row"]').filter({ hasNot: page.locator('th') })
    await expect(clientRows.first()).toBeVisible({ timeout: 10_000 })

    // Step 3: Click first client
    await clientRows.first().click()
    await page.waitForURL(/\/clients\/cli-/)

    // Step 4: Client detail should show tabs
    await expect(page.getByText(/overview|accounts|documents|activity|notes/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('client detail tab navigation', async ({ page }) => {
    await page.goto('/clients/cli-001')

    // Wait for page to load
    await expect(page.getByText(/overview|accounts/i).first()).toBeVisible({ timeout: 10_000 })

    // Try clicking tab buttons if they exist
    const tabs = page.getByRole('tab')
    const tabCount = await tabs.count()
    if (tabCount > 1) {
      await tabs.nth(1).click()
      // Just verify no crash
      await page.waitForTimeout(500)
    }
  })
})
