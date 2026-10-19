import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, pageOverflowX, smallTargets } from './layout-checks'
import { expectNoAxeViolations } from './axe'
import { bookColumn, openPhonePane, settle, showConversations, visit, visitPhone } from './workspace-steps'

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
  { name: 'phone-home-light', open: async (page) => { await visitPhone(page, '/', 'light'); await settle(page) } },
  { name: 'phone-households-light', open: async (page) => {
    await visitPhone(page, '/', 'light')
    await expect(page.getByRole('navigation', { name: 'Book' }).getByRole('list', { name: 'Needs you today' })).toBeVisible()
    await settle(page)
  } },
  { name: 'phone-brief-light', open: async (page) => { await visitPhone(page, '/t/th-brief', 'light'); await settle(page) } },
  { name: 'phone-thread-light', open: async (page) => { await visitPhone(page, '/t/th-johnson-review', 'light'); await settle(page) } },
  { name: 'phone-context-light', open: async (page) => { await visitPhone(page, '/t/th-johnson-review', 'light'); await openPhonePane(page, 'Context'); await settle(page) } },
  { name: 'phone-risk-book-light', open: async (page) => { await visitPhone(page, '/risk', 'light'); await settle(page) } },
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
    await visitPhone(page, '/t/th-brief', 'light')
    const main = await page.getByRole('main').boundingBox()
    if (!main) throw new Error('main is not rendered')
    expect(main.y).toBeLessThan(300)
    await expect(page.getByRole('navigation', { name: 'Panes' }).getByRole('button').first()).toHaveText('Book')
    await expect(bookColumn(page)).toBeHidden()
    await openPhonePane(page, 'Book')
    await expect(bookColumn(page)).toBeFocused()
    await showConversations(page)
    await bookColumn(page).getByRole('link', { name: 'Johnson Rebalance Review', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Johnson Rebalance Review')
    await expect(page.getByRole('navigation', { name: 'Panes' }).getByRole('button', { name: 'Thread', exact: true })).toHaveAttribute('aria-current', 'true')
  })

  test('a page with one pane, such as a reference view, shows no pane bar', async ({ page }) => {
    await visitPhone(page, '/risk', 'light')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Panes' })).toHaveCount(0)
  })

  test('the pane bar works from the keyboard, and nothing scrolls under it', async ({ page }) => {
    await visitPhone(page, '/t/th-johnson-review', 'light')
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

  const panes = (page: Page) => page.getByRole('navigation', { name: 'Panes' })
  const threadList = bookColumn

  test('the brand link home opens on the Book, and focus lands in it', async ({ page }) => {
    await visitPhone(page, '/t/th-brief', 'light')
    await page.getByRole('link', { name: 'Advisor Desktop', exact: true }).click()
    await expect(panes(page).getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-current', 'true')
    await expect(threadList(page)).toBeFocused()
  })

  test('back to a path left on its thread list or its context column focuses that pane', async ({ page }) => {
    await visitPhone(page, '/t/th-brief', 'light')
    await openPhonePane(page, 'Book')
    // A lazily loaded page: its h1 takes focus once the chunk and its data arrive.
    await threadList(page).getByRole('link', { name: 'Risk', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Risk' })).toBeFocused()
    await page.goBack()
    await expect(panes(page).getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-current', 'true')
    await expect(threadList(page)).toBeFocused()

    await visitPhone(page, '/t/th-johnson-review', 'light')
    await openPhonePane(page, 'Context')
    await page.locator('#context-column').getByRole('link', { name: /^Robert Johnson · Individual \(…3847\)/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Robert Johnson · Individual (…3847)' })).toBeFocused()
    await page.goBack()
    await expect(panes(page).getByRole('button', { name: 'Context', exact: true })).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('#context-column')).toBeFocused()
  })

  test('tapping the thread already open in the list shows it', async ({ page }) => {
    await visitPhone(page, '/t/th-johnson-review', 'light')
    await openPhonePane(page, 'Book')
    await showConversations(page)
    await threadList(page).getByRole('link', { name: 'Johnson Rebalance Review', exact: true }).click()
    await expect(panes(page).getByRole('button', { name: 'Thread', exact: true })).toHaveAttribute('aria-current', 'true')
    await expect(page.getByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })).toBeVisible()
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('the drift embed keeps each class, its figure and its status, without the gauge drawing', async ({ page }) => {
    await visitPhone(page, '/t/th-johnson-review', 'light')
    const embed = page.getByRole('region', { name: /^Drift against model/ })
    await expect(embed.getByRole('img', { name: /^US Equity: drift \+13\.2 percentage points/ })).toBeVisible()
    await expect(embed.locator('svg')).toHaveCount(9)
    for (const drawing of await embed.locator('svg').all()) await expect(drawing).toBeHidden()
    const atLimit = embed.locator('[data-status="AT LIMIT"]').first()
    const box = await atLimit.boundingBox()
    if (!box) throw new Error('no AT LIMIT code is rendered')
    expect(box.height).toBeLessThan(20)
  })
})

/** Every 1440px scene's page: none has a control under the 24px target floor, in width or in height. */
const DESKTOP_PATHS = [
  '/', '/t/th-brief', '/t/th-johnson-review', '/t/th-johnson-meeting', '/t/th-pell', '/t/th-robert',
  '/meetings/evt-010', '/prospects/prsp-011', '/accounts/acc-002?from=th-johnson-review', '/households/hh-001', '/clients/cli-001',
  '/archive', '/supervision', '/billing?household=hh-001', '/reconciliation', '/risk', '/accounts/acc-002/risk',
  '/accounts/acc-002/attribution', '/models', '/models/mod-005', '/practice', '/blotter', '/portfolios/trading',
]

test.describe('a desktop at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })

  for (const path of DESKTOP_PATHS) {
    test(`nothing on ${path} is under 24px`, async ({ page }) => {
      await visit(page, path, 'light')
      await settle(page)
      expect(await smallTargets(page, 24)).toEqual([])
    })
  }
})
