import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, pageOverflowX, smallTargets } from './layout-checks'
import { expectNoAxeViolations } from './axe'
import { openPhonePane, settle, visit } from './workspace-steps'

/**
 * A full-page capture of an emulated phone drops the touch emulation (hover and pointer media revert to a
 * desktop's), so the page is shot at its own length instead: the viewport grows to the page, which keeps
 * (hover: none) and (pointer: coarse) true while the pixels are taken.
 */
async function growToPage(page: Page) {
  for (let pass = 0; pass < 3; pass += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('the phone scene has no viewport')
    if (viewport.height === height) return
    await page.setViewportSize({ width: viewport.width, height })
  }
  throw new Error('the page length does not settle as the viewport grows')
}

type Scene = { name: string; open: (page: Page) => Promise<void> }
const SCENES: Scene[] = [
  { name: 'phone-home-light', open: async (page) => { await visit(page, '/', 'light'); await settle(page) } },
  { name: 'phone-brief-light', open: async (page) => { await visit(page, '/t/th-brief', 'light'); await settle(page) } },
  { name: 'phone-thread-light', open: async (page) => { await visit(page, '/t/th-johnson-review', 'light'); await settle(page) } },
  { name: 'phone-context-light', open: async (page) => { await visit(page, '/t/th-johnson-review', 'light'); await openPhonePane(page, 'Context'); await settle(page) } },
  { name: 'phone-risk-book-light', open: async (page) => { await visit(page, '/risk', 'light'); await settle(page) } },
]

test.describe('a phone at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  for (const scene of SCENES) {
    test.describe(scene.name, () => {
      test('baseline at 390px', async ({ page }) => {
        await scene.open(page)
        await growToPage(page)
        await expect(page.getByRole('list', { name: 'Keys' })).toBeHidden()
        await expect(page).toHaveScreenshot(`${scene.name}.png`, { ...SCREENSHOT, fullPage: false })
        await expectNoAxeViolations(page)
      })
      test('no sideways scroll, no key legend, and every control at least 44px', async ({ page }) => {
        await scene.open(page)
        expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
        await expect(page.getByRole('list', { name: 'Keys' })).toBeHidden()
        expect(await smallTargets(page, 44)).toEqual([])
      })
    })
  }

  test('the thread comes first on a thread route, and a thread chosen from the list opens on the thread', async ({ page }) => {
    await visit(page, '/t/th-brief', 'light')
    const main = await page.getByRole('main').boundingBox()
    if (!main) throw new Error('main is not rendered')
    expect(main.y).toBeLessThan(300)
    await expect(page.getByRole('navigation', { name: 'Threads' })).toBeHidden()
    await openPhonePane(page, 'Threads')
    await expect(page.getByRole('navigation', { name: 'Threads' })).toBeFocused()
    await page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name: 'Johnson Rebalance Review', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Johnson Rebalance Review')
    await expect(page.getByRole('navigation', { name: 'Panes' }).getByRole('button', { name: 'Thread', exact: true })).toHaveAttribute('aria-current', 'true')
  })

  test('a page with one pane, such as a reference view, shows no pane bar', async ({ page }) => {
    await visit(page, '/risk', 'light')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Panes' })).toHaveCount(0)
  })

  test('the pane bar works from the keyboard, and nothing scrolls under it', async ({ page }) => {
    await visit(page, '/t/th-johnson-review', 'light')
    const context = page.getByRole('navigation', { name: 'Panes' }).getByRole('button', { name: 'Context', exact: true })
    await context.focus()
    await page.keyboard.press('Enter')
    await expect(context).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('#context-column')).toBeFocused()
    await expect(page.getByRole('main')).toBeHidden()
    const bar = await page.getByRole('navigation', { name: 'Panes' }).boundingBox()
    const panel = await page.locator('#context-column').boundingBox()
    if (!bar || !panel) throw new Error('the pane bar or the context column is not rendered')
    expect(panel.y).toBeGreaterThanOrEqual(bar.y + bar.height)
  })
})

test.describe('a desktop at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })

  test('nothing is under 24px', async ({ page }) => {
    await visit(page, '/t/th-brief', 'light')
    await settle(page)
    expect(await smallTargets(page, 24)).toEqual([])
  })
})
