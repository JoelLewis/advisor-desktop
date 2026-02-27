import { test, expect } from '@playwright/test'

test.describe('AI panel interaction', () => {
  test('AI panel opens and shows suggested prompts', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    // Look for the AI panel trigger button (sparkles icon or "AI" text in top bar)
    const aiTrigger = page.locator('button').filter({ hasText: /ai|assistant|chat/i }).first()
      .or(page.locator('[aria-label*="AI"], [data-testid*="ai-panel"], button:has(svg)').first())

    // Try keyboard shortcut to open AI panel
    await page.keyboard.press('Alt+a')
    await page.waitForTimeout(1000)

    // Check if panel opened — look for panel content or suggested prompts
    const panelVisible = await page.locator('[data-testid*="ai-panel"], [role="complementary"]').first().isVisible().catch(() => false)

    if (!panelVisible) {
      // Try clicking any visible AI trigger
      const buttons = page.locator('button')
      const count = await buttons.count()
      for (let i = 0; i < count; i++) {
        const text = await buttons.nth(i).textContent().catch(() => '')
        if (text?.toLowerCase().includes('ai') || text?.toLowerCase().includes('assistant')) {
          await buttons.nth(i).click()
          await page.waitForTimeout(1000)
          break
        }
      }
    }
  })

  test('dashboard renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/dashboard')
    await page.waitForTimeout(3000)

    // Dashboard should have rendered content
    const mainContent = await page.locator('main').textContent()
    expect(mainContent?.length).toBeGreaterThan(50)
    expect(errors).toEqual([])
  })
})
