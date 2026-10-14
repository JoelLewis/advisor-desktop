import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  approvalOf, approve, askForLetter, askProposalAgent, context, conversation, deskLink, embedOf, heading,
  releaseByShortcut, sendLetter, settle, threadLink, viewAs, type Theme,
} from './workspace-steps'

type Layout = 'supervision' | 'three-panes' | 'list-and-main'
type Scene = { name: string; layout: Layout; open: (page: Page) => Promise<void> }

const queueOf = (page: Page) => page.getByRole('navigation', { name: 'Supervision queue' })
const ordersItem = (page: Page, version: number) => page.getByRole('region', { name: `Orders · Johnson rebalance · v${version}` })

async function approvedV1(page: Page, theme: Theme) {
  await askProposalAgent(page, theme)
  await approve(page, 1)
}

const supervision = (theme: Theme) => async (page: Page) => {
  await approvedV1(page, theme)
  await viewAs(page, 'Mark Davis · Compliance')
  await deskLink(page, 'Supervision').click()
  await expect(heading(page)).toHaveText('Supervision')
  await queueOf(page).getByRole('link', { name: /^Johnson rebalance · v1/ }).click()
  await expect(ordersItem(page, 1).getByRole('table', { name: 'Approved legs · v1' })).toBeVisible()
  await settle(page)
}

const archive = async (page: Page) => {
  await approvedV1(page, 'light')
  await releaseByShortcut(page)
  await deskLink(page, 'Archive').click()
  await expect(page.getByRole('table', { name: 'Archive' })).toContainText('REC-0002 · Released the orders staged from v1 of the Johnson rebalance')
  await settle(page)
}

const threadAfterRelease = async (page: Page) => {
  await approvedV1(page, 'light')
  await releaseByShortcut(page)
  await expect(conversation(page).getByRole('article', { name: 'Fills · Johnson rebalance v1' })).toBeVisible()
  await settle(page)
}

const briefAfterFills = async (page: Page) => {
  await approvedV1(page, 'light')
  await releaseByShortcut(page)
  await threadLink(page, 'Brief').click()
  await expect(page.getByRole('region', { name: 'Ranked summary' })).toContainText('Every asset class is inside its tolerance band.')
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'supervision-light', layout: 'supervision', open: supervision('light') },
  { name: 'supervision-dark', layout: 'supervision', open: supervision('dark') },
  { name: 'archive-light', layout: 'list-and-main', open: archive },
  { name: 'thread-after-release-light', layout: 'three-panes', open: threadAfterRelease },
  { name: 'brief-after-fills-light', layout: 'three-panes', open: briefAfterFills },
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

    for (const width of [1024, 1440]) {
      test(`no page-level horizontal scroll and no clipped labels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await scene.open(page)
        expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
        expect(await clippedLabels(page)).toEqual([])
      })
    }

    if (scene.layout === 'supervision') {
      test('the item sits beside the queue at 1440px and drops below it at 1024px; no thread list', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await scene.open(page)
        await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
        const [queue, item] = await Promise.all([boxOf(queueOf(page)), boxOf(ordersItem(page, 1))])
        expect(item.x).toBeGreaterThanOrEqual(queue.x + queue.width)
        expect(Math.abs(item.y - queue.y)).toBeLessThanOrEqual(1)
        await page.setViewportSize({ width: 1024, height: 900 })
        const [narrowQueue, narrowItem] = await Promise.all([boxOf(queueOf(page)), boxOf(ordersItem(page, 1))])
        expect(narrowItem.y).toBeGreaterThanOrEqual(narrowQueue.y + narrowQueue.height)
      })
    }
  })
}

test('one presenter closes the supervisory loop; the book moves; Robert sees nothing new; the shortcut works alone', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. The Phase 3 story to Approve v3, and Robert's letter sent.
  await askProposalAgent(page, 'light')
  const embed = embedOf(page)
  await embed.getByRole('button', { name: 'Revise' }).click()
  const revise = page.getByRole('dialog', { name: 'Revise the proposal' })
  await revise.getByRole('checkbox', { name: 'Harvest only: sell only lots at a loss' }).check()
  await revise.getByRole('button', { name: 'Ask Proposal Agent to revise' }).click()
  await expect(embed.getByRole('table', { name: 'Proposal legs · v2' })).toBeVisible()
  await embed.getByRole('link', { name: 'Workbench' }).click()
  await expect(heading(page)).toHaveText('Johnson rebalance')
  await expect(page.getByRole('table', { name: 'Legs · v2' })).toBeVisible()
  await page.getByRole('table', { name: 'Legs · v2' }).getByRole('row', { name: /^QAI/ }).focus()
  await page.keyboard.press('x')
  await expect(page.getByRole('table', { name: 'Legs · draft' }).getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByRole('group', { name: 'Draft version' }).getByRole('status').filter({ hasText: 'Saved as v3 · posted to the thread.' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await approve(page, 3)
  await askForLetter(page)
  await sendLetter(page)

  // 2. What Robert sees before compliance acts.
  await viewAs(page, 'Robert Johnson · Client')
  await expect(conversation(page)).toContainText('Dear Robert,')
  const robertBefore = await conversation(page).innerText()

  // 3. Mark: Supervision → the Johnson orders → release with a rationale.
  await viewAs(page, 'Mark Davis · Compliance')
  await deskLink(page, 'Supervision').click()
  await expect(heading(page)).toHaveText('Supervision')
  await queueOf(page).getByRole('link', { name: /^Johnson rebalance · v3/ }).click()
  const orders = ordersItem(page, 3)
  await expect(orders.getByRole('table', { name: 'Approved legs · v3' })).toBeVisible()
  await expect(orders).toContainText('Adrian Hale, Advisor')
  await expect(orders).toContainText('This is the record of what was approved. The checks are not run again here.')
  const release = orders.getByRole('region', { name: 'Record a disposition' })
  await expect(release.getByRole('button', { name: 'Record disposition' })).toBeDisabled()
  await release.getByLabel('Rationale (required)').fill('Harvest-only version; legs, tax effect and the INTC restriction reviewed.')
  await release.getByRole('button', { name: 'Record disposition' }).click()
  await page.getByRole('dialog', { name: 'Release orders?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(page.locator('#act-REC-0003')).toBeFocused()
  await expect(orders).toContainText('FILLED')

  // 4. The fills in the team thread.
  await orders.getByRole('link', { name: /Team thread/ }).click()
  await expect(heading(page)).toHaveText('Johnson Rebalance Review')
  await expect(conversation(page).getByRole('article', { name: 'Fills · Johnson rebalance v3' }).getByRole('table', { name: 'Fills · v3' })).toContainText('INTC')

  // 5. Robert's letter, reviewed after it was sent.
  await deskLink(page, 'Supervision').click()
  await queueOf(page).getByRole('link', { name: /^Message to Robert Johnson/ }).click()
  const letter = page.getByRole('region', { name: 'Correspondence · Message to Robert Johnson' })
  await expect(letter).toContainText('Dear Robert,')
  await expect(letter).toContainText(/from v3 · fingerprint/)
  const review = letter.getByRole('region', { name: 'Record a disposition' })
  await review.getByLabel('Rationale (required)').fill('Accurate and balanced; conditional while the orders were pending.')
  await review.getByRole('button', { name: 'Record disposition' }).click()
  await page.getByRole('dialog', { name: 'Mark reviewed?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(queueOf(page)).toContainText('Nothing sent is waiting for review.')

  // 6. The MSFT alert, disposed of onto its record trail.
  await queueOf(page).getByRole('link', { name: /^Single-name concentration — MSFT in Johnson Trust/ }).click()
  const alert = page.getByRole('region', { name: 'Alert · Single-name concentration — MSFT in Johnson Trust' })
  const dispose = alert.getByRole('region', { name: 'Record a disposition' })
  await dispose.getByLabel('Rationale (required)').fill('Long-held position; the IPS exception is documented and reviewed annually.')
  await dispose.getByRole('button', { name: 'Record disposition' }).click()
  await page.getByRole('dialog', { name: 'Approve?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(alert.getByRole('list', { name: 'Record trail' })).toContainText('Approved')

  // 7. Adrian: Mark's slip and the fills, the account view, the Brief changed.
  await viewAs(page, 'Adrian Hale · Advisor')
  await page.getByRole('link', { name: 'Advisor Desktop' }).click()
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(conversation(page).getByRole('article', { name: 'Released the orders staged from v3 of the Johnson rebalance' })).toContainText('Mark Davis, Compliance')
  await expect(conversation(page).getByRole('article', { name: 'Fills · Johnson rebalance v3' })).toBeVisible()
  await expect(approvalOf(page)).toContainText('v3 was released by compliance and filled')
  await context(page).getByRole('link', { name: /^Robert Johnson Individual/ }).click()
  const holdings = page.getByRole('table', { name: 'Holdings' })
  await expect(holdings.getByRole('row', { name: /^VWO/ })).toHaveCount(1)
  await expect(holdings.getByRole('row', { name: /^INTC/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await threadLink(page, 'Brief').click()
  await expect(page.getByRole('region', { name: 'Ranked summary' })).not.toContainText('The remaining Intel Corp. shares can be sold at a loss today')
  await expect(conversation(page)).toContainText('INTC loss sale of 2026-02-25, open through 2026-03-27')

  // 8. Robert: exactly what he saw before.
  await threadLink(page, 'Robert Johnson').click()
  await viewAs(page, 'Robert Johnson · Client')
  await expect(conversation(page)).toContainText('Dear Robert,')
  expect(await conversation(page).innerText()).toBe(robertBefore)
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await expect(page.locator('body')).not.toContainText(/supervision|rationale|\bfills\b|presenter|escalat|release orders/i)

  // 9. A fresh session: the presenter shortcut, alone.
  await page.reload()
  await expect(heading(page)).toBeVisible()
  await viewAs(page, 'Adrian Hale · Advisor')
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(conversation(page).getByRole('article', { name: /^Fills · / })).toHaveCount(0)
  await context(page).getByRole('button', { name: 'Ask Proposal Agent', exact: true }).click()
  await expect(embedOf(page).getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
  await approve(page, 1)
  await releaseByShortcut(page)
  const slip = context(page).getByRole('article', { name: 'Released the orders staged from v1 of the Johnson rebalance' })
  await expect(slip).toContainText('Mark Davis, Compliance')
  await expect(slip).toContainText('Demo · recorded through the presenter shortcut by Adrian Hale')
  await expect(conversation(page).getByRole('article', { name: 'Fills · Johnson rebalance v1' })).toBeVisible()
})
