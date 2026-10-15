import { expectNoAxeViolations } from './axe'
import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  approve, askProposalAgent, conversation, deskLink, goTo, heading, releaseByShortcut, resolveBreakNamed, settle, takeToTeamThread, threadLink, viewAs, visit, type Theme,
} from './workspace-steps'

type Scene = { name: string; open: (page: Page) => Promise<void> }

const at = (path: string, title: string, theme: Theme = 'light') => async (page: Page) => {
  await visit(page, path, theme)
  await expect(heading(page)).toHaveText(title)
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'billing-light', open: at('/billing?household=hh-001', 'Billing') },
  { name: 'billing-dark', open: at('/billing?household=hh-001', 'Billing', 'dark') },
  { name: 'reconciliation-light', open: at('/reconciliation', 'Reconciliation') },
  { name: 'risk-book-light', open: at('/risk', 'Risk') },
  { name: 'risk-book-dark', open: at('/risk', 'Risk', 'dark') },
  { name: 'risk-account-light', open: at('/accounts/acc-002/risk', 'Risk · Robert Johnson Individual') },
  { name: 'attribution-light', open: at('/accounts/acc-002/attribution', 'Attribution · Robert Johnson Individual') },
  { name: 'models-light', open: at('/models', 'Models') },
  { name: 'model-light', open: at('/models/mod-005', 'Ultra-HNW Multi-Strategy') },
  { name: 'practice-light', open: at('/practice', 'Practice') },
  { name: 'blotter-light', open: at('/blotter', 'Blotter') },
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
      })
    }

    test('the page takes the full width: no thread list', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 900 })
      await scene.open(page)
      await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
    })
  })
}

test('one presenter: the release on the blotter, the moved book in risk and attribution, a break resolved and archived, an account taken to a thread', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. acc-002's factor exposures before anything moves.
  await visit(page, '/accounts/acc-002/risk', 'light')
  const factors = page.getByRole('table', { name: 'Factor exposures' })
  const before = await factors.textContent()

  // 2. The Phase 4 release: v1 approved, released by the presenter's shortcut.
  await askProposalAgent(page, 'light')
  await approve(page, 1)
  await releaseByShortcut(page)

  // 3. The blotter shows the fills, from the proposal, under the release's record.
  await page.getByRole('link', { name: 'Open in the blotter' }).first().click()
  await expect(heading(page)).toHaveText('Blotter')
  const orders = page.getByRole('table', { name: 'Orders' })
  await expect(orders).toContainText('Johnson rebalance v1')
  await expect(orders).toContainText('FILLED')
  await expect(orders).toContainText(/REC-\d{4}/)

  // 4. acc-002's risk and attribution read the moved book.
  await goTo(page, 'Risk · Robert Johnson Individual')
  await expect(heading(page)).toHaveText('Risk · Robert Johnson Individual')
  await expect(factors).not.toHaveText(before ?? '')
  await goTo(page, 'Attribution · Robert Johnson Individual')
  await expect(page.getByRole('table', { name: 'Attribution · Year to date' })).toBeVisible()

  // 5. The Brief's Today reconciliation line → the view → resolve brk-002 as a binding act.
  await visit(page, '/t/th-brief', 'light')
  const line = page.getByRole('region', { name: 'Today' }).getByRole('listitem').filter({ hasText: 'Reconciliation' })
  await expect(line).toContainText('1 open break')
  await line.getByRole('link', { name: 'Open reconciliation' }).click()
  await expect(heading(page)).toHaveText('Reconciliation')
  await resolveBreakNamed(page, 'brk-002', 'Timing difference', 'Schwab confirmed the 24 Feb cash sweep posted after the file was cut.')
  await expect(page.getByRole('table', { name: 'Breaks' }).getByRole('row', { name: /brk-002/ })).toContainText('RESOLVED')

  // 6. The Archive holds it.
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await deskLink(page, 'Archive').click()
  await expect(page.getByRole('table', { name: 'Archive' })).toContainText('Resolved brk-002 · Johnson Family Trust cash balance: timing difference')

  // 7. Book risk: the out-of-band account becomes a team conversation.
  await deskLink(page, 'Risk').click()
  await expect(heading(page)).toHaveText('Risk')
  await takeToTeamThread(page, 'Patel Digital Assets Account')
  await page.getByRole('link', { name: 'In Risk · Patel Digital Assets Account' }).click()
  await expect(heading(page)).toHaveText('Risk · Patel Digital Assets Account')
  await expect(conversation(page).getByRole('article', { name: /^From Risk: Patel Digital Assets Account sits above / })).toBeVisible()
  await expect(threadLink(page, 'Risk · Patel Digital Assets Account')).toBeVisible()

  // 8. An outsider sees none of it.
  await viewAs(page, 'Robert Johnson · Client')
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('heading', { name: 'Reference' })).toHaveCount(0)
  for (const [path, subject] of [['/billing', 'Billing'], ['/reconciliation', 'Reconciliation'], ['/risk', 'Risk'], ['/models', 'Models'], ['/practice', 'Practice'], ['/blotter', 'Blotter']]) {
    await visit(page, path, 'light')
    await expect(heading(page)).toHaveText(`${subject} not found`)
  }
})
