import { expectNoAxeViolations } from './axe'
import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import { approve, askProposalAgent, bookColumn, heading, releaseByShortcut, settle, visit, type Theme } from './workspace-steps'

const holdings = (page: Page) => page.getByRole('main').getByRole('table', { name: 'Holdings by asset class' })

const before = (theme: Theme) => async (page: Page) => {
  await visit(page, '/households/hh-001', theme)
  await expect(holdings(page)).toBeVisible()
  await settle(page)
}

/** The morning's release, then the household reached in the app: a reload would reset the session. */
const after = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await approve(page, 1)
  await releaseByShortcut(page)
  await bookColumn(page).getByRole('list', { name: 'All households' }).getByRole('link', { name: /^Johnson Household/ }).click()
  await expect(heading(page)).toHaveText('Johnson Household')
  await expect(holdings(page)).toContainText('filled today')
  await settle(page)
}

const expanded = async (page: Page) => {
  await visit(page, '/households/hh-001', 'light')
  await holdings(page).getByRole('button', { name: 'US Equity' }).click()
  await expect(page.getByRole('region', { name: 'US Equity · accounts holding it' })).toBeVisible()
  await settle(page)
}

const SCENES: { name: string; open: (page: Page) => Promise<void> }[] = [
  { name: 'household-johnson-before-light', open: before('light') },
  { name: 'household-johnson-before-dark', open: before('dark') },
  { name: 'household-johnson-after-light', open: after('light') },
  { name: 'household-johnson-after-dark', open: after('dark') },
  { name: 'household-class-expanded-light', open: expanded },
]

for (const scene of SCENES) {
  test.describe(scene.name, () => {
    test.describe.configure({ timeout: 120_000 })
    test('baseline at 1440px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await scene.open(page)
      await expect(page).toHaveScreenshot(`${scene.name}.png`, SCREENSHOT)
      await expectNoAxeViolations(page)
    })
    for (const width of [1024, 1440]) {
      test(`no page-level horizontal scroll and no clipped labels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await scene.open(page)
        expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
        expect(await clippedLabels(page)).toEqual([])
        const scroller = holdings(page).locator('xpath=ancestor::div[@data-scroll="table"]')
        await expect(scroller, 'the class table fits without its own sideways scroll').not.toHaveAttribute('data-overflowing', 'true')
      })
    }
  })
}
