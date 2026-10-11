import { test, expect, type Page } from '@playwright/test'

async function openKit(page: Page, theme: 'light' | 'dark', width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ colorScheme: theme })
  await page.goto(`/kit?theme=${theme}`)
  await expect(page.locator('[data-kit-ready="true"]')).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
}

for (const theme of ['light', 'dark'] as const) {
  test(`kit baseline · ${theme}`, async ({ page }) => {
    await openKit(page, theme, 1440)
    await page.screenshot({ path: `docs/superpowers/visual/kit-${theme}.png`, fullPage: true, animations: 'disabled', caret: 'hide' })
  })
}

test('no page-level horizontal scroll at 1024px', async ({ page }) => {
  await openKit(page, 'light', 1024)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('no clipped labels at 1440px', async ({ page }) => {
  await openKit(page, 'light', 1440)
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('th, [data-status], [data-tone], [data-stamp]')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent ?? ''),
  )
  expect(clipped).toEqual([])
})
