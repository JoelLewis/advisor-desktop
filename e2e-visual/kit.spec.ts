import { expectNoAxeViolations } from './axe'
import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'

async function openKit(page: Page, theme: 'light' | 'dark', width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ colorScheme: theme })
  await page.goto(`/kit?theme=${theme}`)
  await expect(page.locator('[data-kit-ready="true"]')).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
}

for (const theme of ['light', 'dark'] as const) {
  test(`kit baseline · ${theme}`, async ({ page }) => {
    await openKit(page, theme, 1440)
    await expect(page).toHaveScreenshot(`kit-${theme}.png`, SCREENSHOT)
    await expectNoAxeViolations(page)
  })
}

test('no page-level horizontal scroll at 1024px', async ({ page }) => {
  await openKit(page, 'light', 1024)
  expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
})

for (const [theme, width] of [['light', 1440], ['dark', 1440], ['light', 1024]] as const) {
  test(`no clipped labels · ${theme} ${width}px`, async ({ page }) => {
    await openKit(page, theme, width)
    expect(await clippedLabels(page)).toEqual([])
  })
}
