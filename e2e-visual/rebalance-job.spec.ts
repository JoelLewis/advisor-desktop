import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'

type Theme = 'light' | 'dark'
type Layout = 'three-panes' | 'workbench'
type Scene = { name: string; layout: Layout; open: (page: Page) => Promise<void> }

async function settle(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: /^(Loading|Updating|Saving)/ })).toHaveCount(0, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  // No hover or focus ring in a baseline: the pointer rests off every control and nothing holds focus.
  await page.mouse.move(0, 0)
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
}

async function visit(page: Page, path: string, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme })
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}theme=${theme}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
}

const heading = (page: Page) => page.getByRole('heading', { level: 1 })
const conversation = (page: Page) => page.getByRole('list', { name: 'Messages' })
const context = (page: Page) => page.getByRole('complementary', { name: 'Thread context' })
const threadLink = (page: Page, name: string) => page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name, exact: true })
const embedOf = (page: Page) => page.getByRole('region', { name: 'Proposal · Johnson rebalance' })
const approvalOf = (page: Page) => context(page).getByRole('region', { name: 'Approval · Johnson rebalance' })
const letterDraft = (page: Page) => context(page).getByRole('article', { name: 'Draft · not sent' })

async function askProposalAgent(page: Page, theme: Theme) {
  await visit(page, '/t/th-johnson-review', theme)
  await context(page).getByRole('button', { name: 'Ask Proposal Agent' }).click()
  await expect(embedOf(page).getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
}

async function approve(page: Page, version: number) {
  const approval = approvalOf(page)
  await approval.getByRole('checkbox', { name: `I reviewed every leg of v${version} and its pre-trade reading.` }).check()
  await approval.getByRole('button', { name: `Approve v${version}` }).click()
  await expect(approval).toContainText(`v${version} is approved`)
  await expect(approval).toContainText('PENDING COMPLIANCE REVIEW')
}

async function askForLetter(page: Page) {
  await threadLink(page, 'Robert Johnson').click()
  await expect(heading(page)).toHaveText('Robert Johnson')
  await context(page).getByRole('button', { name: 'Ask Client Letter Agent' }).click()
  await expect(letterDraft(page)).toContainText('Dear Robert,')
}

async function sendLetter(page: Page) {
  await letterDraft(page).getByRole('button', { name: 'Send to Robert' }).click()
  await expect(conversation(page)).toContainText('Dear Robert,')
  await expect(letterDraft(page)).toHaveCount(0)
}

const brief = (theme: Theme) => async (page: Page) => {
  await visit(page, '/t/th-brief', theme)
  await expect(page.getByRole('region', { name: 'Ranked summary' })).toBeVisible()
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
  await expect(page.getByRole('table', { name: 'Legs · v1' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Draft version' })).toContainText('Showing v1')
  await settle(page)
}

const robertLetter = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await approve(page, 1)
  await askForLetter(page)
  await sendLetter(page)
  await page.getByLabel('View as').selectOption({ label: 'Robert Johnson · Client' })
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

    test('panes side by side at 1440px; the context column drops below main at 1024px', async ({ page }) => {
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
      await page.setViewportSize({ width: 1024, height: 900 })
      const [narrowMain, narrowColumn] = await Promise.all([boxOf(page.getByRole('main')), boxOf(page.locator('#context-column'))])
      expect(narrowColumn.y).toBeGreaterThanOrEqual(narrowMain.y + narrowMain.height)
    })
  })
}

test('one presenter runs Brief → proposal → revise → workbench → approve → letter → send; each viewer sees their part', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. The Brief, ready on load.
  await visit(page, '/t/th-brief', 'light')
  await expect(page.getByRole('region', { name: 'Ranked summary' }).getByRole('listitem').first()).toContainText('US Equity is outside its tolerance band.')

  // 2. The INTC finding goes to the team thread.
  const intc = conversation(page).getByRole('article', { name: /^Harvest Scanner: Intel Corp\. can be sold at a loss today/ })
  await intc.getByRole('button', { name: 'Take to team thread' }).click()
  await expect(intc.getByRole('status')).toHaveText('Taken to Johnson Rebalance Review.')
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(heading(page)).toHaveText('Johnson Rebalance Review')
  await expect(conversation(page).getByRole('article', { name: /^Carried from the Brief: Intel Corp\./ })).toHaveCount(1)

  // 3. The Proposal Agent drafts v1.
  await context(page).getByRole('button', { name: 'Ask Proposal Agent' }).click()
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
  const v2Legs = page.getByRole('table', { name: 'Legs · v2' })
  await expect(v2Legs).toBeVisible()
  await v2Legs.getByRole('row', { name: /^QAI/ }).focus()
  await page.keyboard.press('x')
  const draftLegs = page.getByRole('table', { name: 'Legs · draft' })
  await expect(draftLegs.getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true')
  await draftLegs.getByRole('row', { name: /^INTC/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'Leg · INTC' })).toBeVisible()
  const bar = page.getByRole('group', { name: 'Draft version' })
  await expect(bar).toContainText('Draft · not saved')
  await expect(bar.getByRole('button', { name: 'Save as v3' })).toBeEnabled()
  await page.keyboard.press('ControlOrMeta+s')
  await expect(bar.getByRole('status').filter({ hasText: 'Saved as v3 · posted to the thread.' })).toBeVisible()
  const liveThread = page.getByRole('complementary', { name: 'Live thread' }).getByRole('list', { name: 'Thread feed' })
  await expect(liveThread).toContainText(/v3 · .*IQ Hedge Multi-Strategy Tracker ETF/)

  // Back in the thread the embed is already v3, and the version line says so.
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await expect(heading(page)).toHaveText('Johnson Rebalance Review')
  await expect(embed.getByRole('table', { name: 'Proposal legs · v3' })).toBeVisible()
  await expect(conversation(page).getByRole('article', { name: 'v3 · Adrian Hale' })).toBeVisible()

  // 6. Approve v3: the act is recorded and the orders are staged from it, pending compliance review.
  await approve(page, 3)
  await expect(approvalOf(page)).toContainText(/Staged from v3 · REC-/)

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
  await expect(threadLinks).toHaveAccessibleName('Robert Johnson')
  await expect(conversation(page)).toContainText('Dear Robert,')
  await expect(conversation(page)).toContainText('I will call you on Friday to walk through it.')
  // The firm's wording stays with the firm: no binding-act or supervisory language, no letter origin, no agents, no team thread.
  const body = page.locator('body')
  for (const hidden of ['binding', 'Supervisory review', 'fingerprint', 'edited by', 'Proposal', 'Client Letter Agent', 'Johnson Rebalance Review']) {
    await expect(body).not.toContainText(hidden)
  }

  // 9. Mark: the firm threads but not the Brief; the staged orders pending compliance review; nothing for him to approve.
  await viewAs.selectOption({ label: 'Mark Davis · Compliance' })
  await expect(threadLink(page, 'Johnson Rebalance Review')).toHaveCount(1)
  await expect(threadLink(page, 'Brief')).toHaveCount(0)
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(heading(page)).toHaveText('Johnson Rebalance Review')
  const markApproval = approvalOf(page)
  await expect(markApproval).toContainText('PENDING COMPLIANCE REVIEW')
  await expect(markApproval).toContainText(/Staged from v3 · REC-/)
  await expect(markApproval.getByRole('button')).toHaveCount(0)
})
