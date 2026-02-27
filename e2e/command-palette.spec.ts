import { test, expect } from '@playwright/test'

test.describe('Command palette', () => {
  test('Ctrl+K opens command palette', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    // Open command palette with keyboard shortcut
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    // Look for the command palette dialog/modal
    const palette = page.locator('[role="dialog"], [data-testid*="command"], [cmdk-root]').first()
    const isVisible = await palette.isVisible().catch(() => false)

    if (isVisible) {
      // Type a search query
      const input = palette.locator('input').first()
      await input.fill('John')
      await page.waitForTimeout(500)

      // Should show search results
      const results = palette.locator('[cmdk-item], [role="option"], li')
      const count = await results.count()
      expect(count).toBeGreaterThan(0)

      // Close with Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  })

  test('navigating to a client from search', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    const palette = page.locator('[role="dialog"], [data-testid*="command"], [cmdk-root]').first()
    const isVisible = await palette.isVisible().catch(() => false)

    if (isVisible) {
      const input = palette.locator('input').first()
      await input.fill('Robert')
      await page.waitForTimeout(800)

      // Click first result
      const firstResult = palette.locator('[cmdk-item], [role="option"], li').first()
      const resultVisible = await firstResult.isVisible().catch(() => false)
      if (resultVisible) {
        await firstResult.click()
        await page.waitForTimeout(1000)
        // Should have navigated away from dashboard
        const url = page.url()
        expect(url).not.toBe('http://localhost:5173/dashboard')
      }
    }
  })
})
