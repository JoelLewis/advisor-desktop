import { expectNoAxeViolations } from './axe'
import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  approvalOf, approve, askForLetter, askProposalAgent, context, conversation, embedOf, heading, letterDraft, sendLetter,
  settle, shareFindingTo, threadLink, visit, type Theme,
} from './workspace-steps'

type Layout = 'three-panes' | 'workbench'
type Scene = { name: string; layout: Layout; open: (page: Page) => Promise<void> }

const brief = (theme: Theme) => async (page: Page) => {
  await visit(page, '/t/th-brief', theme)
  await expect(page.getByRole('region', { name: 'Needs a decision' })).toBeVisible()
  await settle(page)
}

const proposalThread = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await settle(page)
}

const workbench = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await embedOf(page).getByRole('link', { name: 'Workbench' }).click()
  await expect(heading(page)).toHaveText('Johnson rebalance')
  await expect(page.getByRole('grid', { name: 'Legs · v1' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Draft version' })).toContainText('Showing v1')
  await settle(page)
}

const robertLetter = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await approve(page, 1)
  await askForLetter(page)
  await sendLetter(page)
  await page.getByLabel('View as').selectOption({ label: 'Robert Johnson · Client' })
  await expect(heading(page)).toHaveText('Your conversation with Larkfield')
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await expect(conversation(page)).toContainText('Dear Robert,')
  await settle(page)
}

const SCENES: Scene[] = (['light', 'dark'] as const).flatMap((theme): Scene[] => [
  { name: `brief-${theme}`, layout: 'three-panes', open: brief(theme) },
  { name: `proposal-thread-${theme}`, layout: 'three-panes', open: proposalThread(theme) },
  { name: `workbench-${theme}`, layout: 'workbench', open: workbench(theme) },
  { name: `robert-letter-${theme}`, layout: 'three-panes', open: robertLetter(theme) },
])

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

    // One fresh page per width: a scene changes what its viewer can do (Robert cannot ask an agent), so it opens once per page.
    for (const width of [1024, 1440]) {
      test(`no page-level horizontal scroll and no clipped labels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await scene.open(page)
        expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
        expect(await clippedLabels(page)).toEqual([])
      })
    }

    test('panes side by side at 1440px; the context column drops below main at 900px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await scene.open(page)
      const [main, column] = await Promise.all([boxOf(page.getByRole('main')), boxOf(page.locator('#context-column'))])
      expect(column.x).toBeGreaterThanOrEqual(main.x + main.width)
      expect(Math.abs(column.y - main.y)).toBeLessThanOrEqual(1)
      if (scene.layout === 'three-panes') {
        const threads = await boxOf(page.getByRole('navigation', { name: 'Threads' }))
        expect(main.x).toBeGreaterThanOrEqual(threads.x + threads.width)
      } else {
        await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
      }
      await page.setViewportSize({ width: 900, height: 900 })
      const [narrowMain, narrowColumn] = await Promise.all([boxOf(page.getByRole('main')), boxOf(page.locator('#context-column'))])
      expect(narrowColumn.y).toBeGreaterThanOrEqual(narrowMain.y + narrowMain.height)
    })
  })
}

test('a proposal on a fresh load · baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await visit(page, '/proposals/prop-0001', 'light')
  await expect(heading(page)).toHaveText('Proposal not found')
  await settle(page)
  await expect(page).toHaveScreenshot('proposal-reset-light.png', SCREENSHOT)
  await expectNoAxeViolations(page)
})

test('one presenter runs Brief → proposal → revise → workbench → approve → letter → send; each viewer sees their part', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. The Brief, ready on load.
  await visit(page, '/t/th-brief', 'light')
  await expect(page.getByRole('region', { name: 'Needs a decision' }).getByRole('listitem').first()).toContainText('US Equity is outside its tolerance band')
  await expect(page.getByRole('region', { name: 'Needs a decision' })).toContainText("Growth sits above Robert Johnson's Moderate tolerance for this account; after a full rebalance to the model, Robert Johnson's accounts as a whole would sit within it")

  // 2. The INTC finding goes to the team thread.
  const intc = conversation(page).getByRole('article', { name: /^Harvest Scanner: The remaining Intel Corp\. shares can be sold at a loss today/ })
  await shareFindingTo(intc, 'Johnson Rebalance Review')
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(heading(page)).toHaveText('Johnson Rebalance Review')
  await expect(conversation(page).getByRole('article', { name: /^Shared from the Brief: The remaining Intel Corp\. shares/ })).toHaveCount(1)

  // 3. The Proposal Agent drafts v1.
  await context(page).getByRole('button', { name: 'Ask Proposal Agent', exact: true }).click()
  const embed = embedOf(page)
  await expect(embed.getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
  await expect(embed).toContainText('v1 is not approved')

  // 4. Revised under "harvest only": v2.
  await embed.getByRole('button', { name: 'Revise' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revise the proposal' })
  await dialog.getByRole('checkbox', { name: 'Harvest only: sell only lots at a loss' }).check()
  await dialog.getByRole('button', { name: 'Ask Proposal Agent to revise' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(conversation(page).getByRole('article', { name: 'v2 · Proposal Agent' })).toBeVisible()
  await expect(embed.getByRole('table', { name: 'Proposal legs · v2' })).toBeVisible()

  // 5. The workbench, by keyboard: open INTC's lots, exclude a leg, save v3 with ⌘S / Ctrl+S; the live thread shows v3.
  await embed.getByRole('link', { name: 'Workbench' }).click()
  await expect(heading(page)).toHaveText('Johnson rebalance')
  const v2Legs = page.getByRole('grid', { name: 'Legs · v2' })
  await expect(v2Legs).toBeVisible()
  await v2Legs.getByRole('row', { name: /^QAI/ }).focus()
  await page.keyboard.press('x')
  const draftLegs = page.getByRole('grid', { name: 'Legs · draft' })
  await expect(draftLegs.getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true')
  await draftLegs.getByRole('row', { name: /^INTC/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'Leg · INTC' })).toBeVisible()
  const bar = page.getByRole('group', { name: 'Draft version' })
  await expect(bar).toContainText('Draft · not saved')
  await expect(bar.getByRole('button', { name: 'Save as v3' })).toBeEnabled()
  await page.keyboard.press('ControlOrMeta+s')
  await expect(bar.getByText('Saved as v3 · posted to the thread.')).toBeVisible()
  const liveThread = page.getByRole('complementary', { name: 'Live thread' }).getByRole('list', { name: 'Thread feed' })
  await expect(liveThread).toContainText(/v3 · .*IQ Hedge Multi-Strategy Tracker ETF/)

  // Back in the thread the embed is already v3, and the version line says so.
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await expect(heading(page)).toHaveText('Johnson Rebalance Review')
  await expect(embed.getByRole('table', { name: 'Proposal legs · v3' })).toBeVisible()
  await expect(conversation(page).getByRole('article', { name: 'v3 · Adrian Hale' })).toBeVisible()

  // 6. Approve v3: the act is recorded and the orders are staged from it, pending compliance review.
  await approve(page, 3)
  await expect(approvalOf(page)).toContainText(/From v3 · approval REC-/)

  // 7. The letter: drafted by the Client Letter Agent from v3, edited, sent.
  await askForLetter(page)
  const draft = letterDraft(page)
  await expect(draft).toContainText('from v3')
  await expect(draft).toContainText('is expected to realize a loss of about')
  await expect(draft).toContainText('if the sale is made on')
  await draft.getByRole('button', { name: 'Edit' }).click()
  const editor = draft.getByRole('textbox', { name: 'Edit the letter' })
  await editor.fill(`${await editor.inputValue()}\n\nI will call you on Friday to walk through it.`)
  await draft.getByRole('button', { name: 'Save edit' }).click()
  await expect(letterDraft(page)).toContainText('edited by Adrian Hale')
  await sendLetter(page)
  await expect(conversation(page)).toContainText('I will call you on Friday to walk through it.')
  // The firm's record names the version and the editor.
  await expect(context(page)).toContainText(/from v3 · fingerprint .* · edited by Adrian Hale/)

  // 8. Robert: only his thread, and only that message from the firm.
  const viewAs = page.getByLabel('View as')
  await viewAs.selectOption({ label: 'Robert Johnson · Client' })
  const threadLinks = page.getByRole('navigation', { name: 'Threads' }).getByRole('link')
  await expect(threadLinks).toHaveCount(1)
  await expect(threadLinks).toHaveAccessibleName('Your conversation with Larkfield')
  await expect(conversation(page)).toContainText('Dear Robert,')
  await expect(conversation(page)).toContainText('I will call you on Friday to walk through it.')
  // His conversation is his question, the letter and its record: nothing else from the firm.
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  // The firm's provenance stays with the firm: no record language or supervisory review, no letter origin, no agents,
  // no proposal or staging, no team thread. His own slip carries no fingerprint and no record id.
  await expect(conversation(page).getByRole('listitem').last()).not.toContainText(/fingerprint|REC-\d{4}/)
  await expect(page.locator('body')).not.toContainText(
    /binding|supervisory review|edited by|from v\d|proposal|client letter|drift monitor|harvest scanner|pre-trade check|johnson rebalance review|staged/i,
  )

  // 9. Mark: the firm threads but not the Brief; the staged orders pending compliance review; nothing for him to approve.
  await viewAs.selectOption({ label: 'Mark Davis · Compliance' })
  await expect(threadLink(page, 'Johnson Rebalance Review')).toHaveCount(1)
  await expect(threadLink(page, 'Brief')).toHaveCount(0)
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(heading(page)).toHaveText('Johnson Rebalance Review')
  const markApproval = approvalOf(page)
  await expect(markApproval).toContainText('PENDING COMPLIANCE RELEASE')
  await expect(markApproval).toContainText(/From v3 · approval REC-/)
  await expect(markApproval.getByRole('button')).toHaveCount(0)
})
