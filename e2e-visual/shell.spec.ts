import { expectNoAxeViolations } from './axe'
import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import { approve, askProposalAgent } from './workspace-steps'

type Theme = 'light' | 'dark'
type Scene = { name: string; hasContext: boolean; open: (page: Page) => Promise<void> }

async function settle(page: Page) {
  await expect(page.getByText(/^Loading/)).toHaveCount(0, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  // No hover state in a baseline: the pointer rests off every control.
  await page.mouse.move(0, 0)
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
  await expect(page.locator('#context-column').getByText('Drift Monitor reported in the thread.')).toBeVisible()
  await expect(findings.first()).toBeVisible()
  await settle(page)
}

const robertOnHisThread = (theme: Theme) => async (page: Page) => {
  await visit(page, '/', theme)
  await page.getByLabel('View as').selectOption({ label: 'Robert Johnson · Client' })
  await visit(page, '/t/th-robert', theme)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your conversation with Larkfield')
  const threadLinks = page.getByRole('navigation', { name: 'Threads' }).getByRole('link')
  await expect(threadLinks).toHaveCount(1)
  await expect(threadLinks).toHaveAccessibleName('Your conversation with Larkfield')
  await settle(page)
}

async function accountFullView(page: Page) {
  await visit(page, '/accounts/acc-002?from=th-johnson-review', 'light')
  await settle(page)
}

const home = (theme: Theme) => async (page: Page) => {
  await visit(page, '/', theme)
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name: 'Brief', exact: true })).toBeVisible()
  await settle(page)
}

const homeMidStory = async (page: Page) => {
  await askProposalAgent(page, 'light')
  await approve(page, 1)
  // An in-app link, not a reload: a reload resets the session.
  await page.getByRole('banner').getByRole('link', { name: 'Advisor Desktop' }).click()
  await expect(page.getByRole('list', { name: 'The five-minute path' }).getByRole('listitem').nth(2)).toContainText('NEXT')
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'home-light', hasContext: false, open: home('light') },
  { name: 'home-dark', hasContext: false, open: home('dark') },
  { name: 'home-mid-story-light', hasContext: false, open: homeMidStory },
  { name: 'adrian-johnson-finding-light', hasContext: true, open: adrianAsksDriftMonitor('light') },
  { name: 'adrian-johnson-finding-dark', hasContext: true, open: adrianAsksDriftMonitor('dark') },
  { name: 'robert-thread-light', hasContext: true, open: robertOnHisThread('light') },
  { name: 'robert-thread-dark', hasContext: true, open: robertOnHisThread('dark') },
  { name: 'account-full-view-light', hasContext: false, open: accountFullView },
  { name: 'adrian-robert-thread-light', hasContext: true, open: async (page) => { await visit(page, '/t/th-robert', 'light'); await settle(page) } },
  { name: 'not-found-light', hasContext: false, open: async (page) => { await visit(page, '/portfolios/trading', 'light'); await settle(page) } },
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
      await expectNoAxeViolations(page)
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

      test('three panes side by side at 1024px', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 900 })
        await scene.open(page)
        const [threads, main, context] = await Promise.all([
          boxOf(page.getByRole('navigation', { name: 'Threads' })), boxOf(page.getByRole('main')), boxOf(page.locator('#context-column')),
        ])
        expect(main.x).toBeGreaterThanOrEqual(threads.x + threads.width)
        expect(context.x).toBeGreaterThanOrEqual(main.x + main.width)
        expect(Math.abs(context.y - main.y)).toBeLessThanOrEqual(1)
      })

      test('thread list beside main, context column under the thread at 900px', async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 900 })
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

test('the success path on the real app: ask, full view and back, draft, send, and each viewer sees their part', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const heading = page.getByRole('heading', { level: 1 })
  const conversation = page.getByRole('list', { name: 'Messages' })
  const threadNav = page.getByRole('navigation', { name: 'Threads' })
  const threadLinks = threadNav.getByRole('link')
  const threadLink = (name: string) => threadNav.getByRole('link', { name, exact: true })
  const viewAs = page.getByLabel('View as')

  // Adrian asks Drift Monitor in the Johnson thread.
  await visit(page, '/t/th-johnson-review', 'light')
  await expect(heading).toHaveText('Johnson Rebalance Review')
  await page.getByRole('button', { name: 'Ask Drift Monitor' }).click()
  await expect(conversation.getByRole('article', { name: /^Drift Monitor: / }).first()).toBeVisible()

  // Opens the account full view from the embed, then goes back to the thread.
  await conversation.getByRole('region', { name: /^Drift against model/ }).getByRole('link', { name: 'Open full view' }).click()
  await expect(heading).toHaveText('Robert Johnson Individual')
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await expect(heading).toHaveText('Johnson Rebalance Review')

  // Drafts in Robert's thread and sends it as a recorded act.
  const message = 'Your annual review is booked for next month.'
  await threadLink('Robert Johnson').click()
  await expect(heading).toHaveText('Robert Johnson')
  await page.getByRole('textbox', { name: 'Message to Robert Johnson' }).fill(message)
  await page.getByRole('button', { name: 'Save draft' }).click()
  await page.getByRole('article', { name: 'Draft · not sent' }).getByRole('button', { name: 'Send to Robert' }).click()
  await expect(conversation).toContainText(message)
  await expect(page.getByRole('article', { name: 'Message sent to the client' }).first()).toBeVisible()

  // Robert sees only his thread, with the message.
  await viewAs.selectOption({ label: 'Robert Johnson · Client' })
  await expect(threadLinks).toHaveCount(1)
  await expect(heading).toHaveText('Your conversation with Larkfield')
  await expect(conversation).toContainText(message)

  // Mark sees the firm threads and the finding, not Adrian's private brief.
  await viewAs.selectOption({ label: 'Mark Davis · Compliance' })
  await expect(threadLink('Johnson Rebalance Review')).toHaveCount(1)
  await expect(threadLink('Brief')).toHaveCount(0)
  await threadLink('Johnson Rebalance Review').click()
  await expect(heading).toHaveText('Johnson Rebalance Review')
  await expect(conversation.getByRole('article', { name: /^Drift Monitor: / }).first()).toBeVisible()
})

test.describe('a browser that blocks service workers', () => {
  test.use({ serviceWorkers: 'block' })

  test('gets a page that says the demo needs one, never a blank page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The demo could not start', { timeout: 15_000 })
    await expect(page.getByRole('main')).toContainText('This demo runs its server in your browser as a service worker')
    await expectNoAxeViolations(page)
  })
})

test("a browser that cannot load the app's code gets a page that says so, never the static header alone", async ({ page }) => {
  await page.route(/\/src\/app\/App\.tsx/, (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The demo could not start', { timeout: 15_000 })
  await expect(page.getByRole('main')).toContainText("The demo's code did not finish loading")
  await expect(page.locator('#boot-theme-label')).toHaveCount(0)
  await expectNoAxeViolations(page)
})

test('the key sheet with the single-key setting · baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await visit(page, '/', 'light')
  await settle(page)
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard' }).getByRole('switch', { name: 'Single-key shortcuts' })).toBeChecked()
  await expect(page).toHaveScreenshot('key-sheet-light.png', SCREENSHOT)
  await expectNoAxeViolations(page)
})

test('opening a thread from the list focuses its title and leaves the shell header in view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await visit(page, '/t/th-brief', 'light')
  await settle(page)
  await page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name: 'Johnson Rebalance Review', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.getByRole('link', { name: 'Advisor Desktop', exact: true })).toBeInViewport()
})
