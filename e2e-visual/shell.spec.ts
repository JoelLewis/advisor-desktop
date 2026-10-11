import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'

type Theme = 'light' | 'dark'
type Scene = { name: string; hasContext: boolean; open: (page: Page) => Promise<void> }

async function settle(page: Page) {
  await expect(page.getByText(/^Loading/)).toHaveCount(0, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
}

async function visit(page: Page, path: string, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme })
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}theme=${theme}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
}

const adrianAsksDriftMonitor = (theme: Theme) => async (page: Page) => {
  await visit(page, '/t/th-johnson-review', theme)
  const findings = page.getByRole('article', { name: /^Drift Monitor: / })
  await expect(findings).toHaveCount(0)
  await page.getByRole('button', { name: 'Ask Drift Monitor' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Drift Monitor reported in the thread.' })).toBeVisible()
  await expect(findings.first()).toBeVisible()
  await settle(page)
}

async function robertOnHisThread(page: Page) {
  await visit(page, '/', 'light')
  await page.getByLabel('View as').selectOption({ label: 'Robert Johnson · Client' })
  await visit(page, '/t/th-robert', 'light')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Robert Johnson')
  const threadLinks = page.getByRole('navigation', { name: 'Threads' }).getByRole('link')
  await expect(threadLinks).toHaveCount(1)
  await expect(threadLinks).toHaveAccessibleName('Robert Johnson')
  await settle(page)
}

async function accountFullView(page: Page) {
  await visit(page, '/accounts/acc-002?from=th-johnson-review', 'light')
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'adrian-johnson-finding-light', hasContext: true, open: adrianAsksDriftMonitor('light') },
  { name: 'adrian-johnson-finding-dark', hasContext: true, open: adrianAsksDriftMonitor('dark') },
  { name: 'robert-thread-light', hasContext: true, open: robertOnHisThread },
  { name: 'account-full-view-light', hasContext: false, open: accountFullView },
]

async function boxOf(region: Locator) {
  const box = await region.boundingBox()
  if (!box) throw new Error('region is not rendered')
  return box
}

for (const scene of SCENES) {
  test.describe(scene.name, () => {
    test('baseline at 1440px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await scene.open(page)
      await expect(page).toHaveScreenshot(`${scene.name}.png`, SCREENSHOT)
    })

    test('no page-level horizontal scroll and no clipped labels at 1024px', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 900 })
      await scene.open(page)
      expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
      expect(await clippedLabels(page)).toEqual([])
    })

    test('no clipped labels at 1440px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await scene.open(page)
      expect(await clippedLabels(page)).toEqual([])
    })

    if (scene.hasContext) {
      test('three panes side by side at 1440px', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await scene.open(page)
        const [threads, main, context] = await Promise.all([
          boxOf(page.getByRole('navigation', { name: 'Threads' })), boxOf(page.getByRole('main')), boxOf(page.locator('#context-column')),
        ])
        expect(main.x).toBeGreaterThanOrEqual(threads.x + threads.width)
        expect(context.x).toBeGreaterThanOrEqual(main.x + main.width)
        expect(Math.abs(context.y - main.y)).toBeLessThanOrEqual(1)
      })

      test('thread list beside main, context column under the thread at 1024px', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 900 })
        await scene.open(page)
        const [threads, main, context] = await Promise.all([
          boxOf(page.getByRole('navigation', { name: 'Threads' })), boxOf(page.getByRole('main')), boxOf(page.locator('#context-column')),
        ])
        expect(main.x).toBeGreaterThanOrEqual(threads.x + threads.width)
        expect(Math.abs(main.y - threads.y)).toBeLessThanOrEqual(1)
        expect(context.y).toBeGreaterThanOrEqual(main.y + main.height)
        expect(Math.abs(context.x - main.x)).toBeLessThanOrEqual(1)
      })
    }
  })
}
