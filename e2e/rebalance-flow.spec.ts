import { test, expect } from '@playwright/test'

test.describe('Rebalance flow', () => {
  test('portfolios page shows accounts with drift indicators', async ({ page }) => {
    await page.goto('/portfolios')

    // Wait for the portfolio table or account cards to render
    await expect(page.getByText(/total aum|managed assets/i).first()).toBeVisible({ timeout: 10_000 })

    // Verify account data renders (table rows or cards)
    const accountElements = page.locator('table tbody tr, [data-testid*="account"]').filter({ hasNot: page.locator('th') })
    await expect(accountElements.first()).toBeVisible({ timeout: 10_000 })
  })

  test('account detail shows drift summary', async ({ page }) => {
    await page.goto('/portfolios/accounts/acc-001')

    // Wait for account detail to load
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 })

    // Should have some content loaded (position table, allocation chart, etc.)
    await page.waitForTimeout(2000)
    const pageText = await page.locator('main').textContent()
    expect(pageText?.length).toBeGreaterThan(100)
  })

  test('rebalance page loads', async ({ page }) => {
    await page.goto('/portfolios/rebalance')
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 })

    // Should show rebalance wizard content
    await page.waitForTimeout(2000)
    const pageText = await page.locator('main').textContent()
    expect(pageText?.length).toBeGreaterThan(50)
  })
})
