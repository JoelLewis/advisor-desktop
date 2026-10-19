import { expectNoAxeViolations } from './axe'
import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  approve, askForRecap, askProposalAgent, context, conversation, deskLink, draftNotes, fileRecord, goTo, heading, holdTheMeeting,
  letterDraft, meetingPanel, releaseByShortcut, runPrep, bookColumn, settle, openThread, viewAs, visit, type Theme,
} from './workspace-steps'

type Layout = 'three-panes' | 'beside-thread' | 'full-width'
type Scene = { name: string; layout: Layout; held?: boolean; open: (page: Page) => Promise<void> }

const liveThread = (page: Page) => page.getByRole('complementary', { name: 'Live thread' })

async function meetingView(page: Page) {
  await meetingPanel(page).getByRole('link', { name: /Open the meeting view/ }).click()
  await expect(heading(page)).toHaveText('Johnson annual review')
  await expect(liveThread(page).getByRole('list', { name: 'Thread feed' })).toBeVisible()
}

/**
 * The morning (Phases 3–4): v1 approved and released through the presenter shortcut, so the meeting reads the released book —
 * as transcript t-02 says ("This morning we rebalanced … sold the rest of the Intel shares"). The store lives in the page,
 * so every later step navigates inside the app.
 */
async function morning(page: Page, theme: Theme) {
  await askProposalAgent(page, theme)
  await approve(page, 1)
  await releaseByShortcut(page)
}

async function toMeetingThread(page: Page) {
  await openThread(page, 'Johnson annual review')
  await expect(heading(page)).toHaveText('Johnson annual review')
}

const meetingThread = async (page: Page) => {
  await morning(page, 'light')
  await toMeetingThread(page)
  await runPrep(page)
  await settle(page)
}

const meetingBefore = (theme: Theme) => async (page: Page) => {
  await morning(page, theme)
  await toMeetingThread(page)
  await runPrep(page)
  await meetingView(page)
  await expect(page.getByRole('region', { name: 'Household reference' })).toBeVisible()
  await settle(page)
}

const meetingAfter = (theme: Theme) => async (page: Page) => {
  await morning(page, theme)
  await toMeetingThread(page)
  await runPrep(page)
  await meetingView(page)
  await holdTheMeeting(page)
  await draftNotes(page)
  await expect(page.getByRole('list', { name: 'Decisions' })).toBeVisible()
  await settle(page)
}

const client = async (page: Page) => {
  await visit(page, '/clients/cli-001', 'light')
  await expect(page.getByRole('table', { name: 'Accounts owned' })).toBeVisible()
  await settle(page)
}

async function recapDrafted(page: Page) {
  await morning(page, 'light')
  await toMeetingThread(page)
  await holdTheMeeting(page)
  await draftNotes(page)
  await fileRecord(page)
  await openThread(page, 'Robert Johnson')
  await expect(heading(page)).toHaveText('Robert Johnson')
  await askForRecap(page)
  await expect(letterDraft(page)).toContainText("Please don't buy Intel shares in any of your accounts through March 27, 2026.")
}

const robertRecap = async (page: Page) => {
  await recapDrafted(page)
  await settle(page)
}

/** Robert's own view once the recap is sent: his question, the recap and its slip. */
const robertRecapClient = async (page: Page) => {
  await recapDrafted(page)
  await letterDraft(page).getByRole('button', { name: 'Send to Robert and Patricia' }).click()
  await expect(conversation(page)).toContainText('What we decided:')
  await viewAs(page, 'Robert Johnson · Client')
  await expect(heading(page)).toHaveText('Your conversation with Larkfield')
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  await settle(page)
}

/** Patricia's own view once the recap is sent: the recap and its record, in her own conversation. */
const patriciaRecapClient = async (page: Page) => {
  await recapDrafted(page)
  await letterDraft(page).getByRole('button', { name: 'Send to Robert and Patricia' }).click()
  await expect(conversation(page)).toContainText('What we decided:')
  await viewAs(page, 'Patricia Johnson · Client')
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await page.getByRole('navigation', { name: 'Threads' }).getByRole('link').click()
  await expect(heading(page)).toHaveText('Your conversation with Larkfield')
  await expect(conversation(page).getByRole('listitem')).toHaveCount(2)
  await expect(conversation(page)).toContainText("We won't trade in Patricia's accounts")
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'meeting-thread-light', layout: 'three-panes', open: meetingThread },
  { name: 'meeting-before-light', layout: 'beside-thread', open: meetingBefore('light') },
  { name: 'meeting-before-dark', layout: 'beside-thread', open: meetingBefore('dark') },
  { name: 'meeting-after-light', layout: 'beside-thread', held: true, open: meetingAfter('light') },
  { name: 'meeting-after-dark', layout: 'beside-thread', held: true, open: meetingAfter('dark') },
  { name: 'client-light', layout: 'full-width', open: client },
  { name: 'robert-recap-light', layout: 'three-panes', open: robertRecap },
  { name: 'robert-recap-client-light', layout: 'three-panes', open: robertRecapClient },
  { name: 'patricia-recap-client-light', layout: 'three-panes', open: patriciaRecapClient },
]

async function boxOf(region: Locator) {
  const box = await region.boundingBox()
  if (!box) throw new Error('region is not rendered')
  return box
}

for (const scene of SCENES) {
  test.describe(scene.name, () => {
    // The morning's release runs before each meeting scene.
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

    if (scene.layout === 'beside-thread') {
      test('the meeting takes the main pane beside the live thread; no thread list', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await scene.open(page)
        await expect(bookColumn(page)).toHaveCount(0)
        const [main, live] = await Promise.all([boxOf(page.getByRole('main')), boxOf(liveThread(page))])
        expect(live.x).toBeGreaterThanOrEqual(main.x + main.width - 1)
      })
    }

    if (scene.layout === 'full-width') {
      test('the view takes the full width, as Supervision does: no thread list', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 900 })
        await scene.open(page)
        await expect(bookColumn(page)).toHaveCount(0)
      })
    }

    if (scene.held) {
      test('the transcript sits beside the notes at 1440px and above them at 900px', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await scene.open(page)
        const transcript = page.getByRole('list', { name: 'Transcript' })
        const notes = page.getByRole('list', { name: 'Discussion' })
        const [t, n] = await Promise.all([boxOf(transcript), boxOf(notes)])
        expect(n.x).toBeGreaterThanOrEqual(t.x + t.width)
        await page.setViewportSize({ width: 900, height: 900 })
        const [narrowT, narrowN] = await Promise.all([boxOf(transcript), boxOf(notes)])
        expect(narrowN.y).toBeGreaterThanOrEqual(narrowT.y + narrowT.height)
      })
    }
  })
}

test('one presenter runs the Johnson annual review end to end; Robert sees only the recap; Mark sees the record', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. The morning (Phases 3–4): v1 approved and released through the presenter shortcut, so the meeting reads the released book.
  await askProposalAgent(page, 'light')
  await approve(page, 1)
  await releaseByShortcut(page)

  // 2. The Brief's Today line for the meeting, to the meeting thread.
  await bookColumn(page).getByRole('link', { name: 'Brief', exact: true }).click()
  const today = page.getByRole('region', { name: 'Today' })
  await expect(today.getByRole('listitem').filter({ hasText: 'Johnson annual review' })).toContainText('14:00–15:15 ET')
  await today.getByRole('link', { name: 'Open the meeting thread' }).click()
  await expect(heading(page)).toHaveText('Johnson annual review')

  // 3. Prep: findings in the thread, agenda v1; Adrian adds an item (v2).
  await runPrep(page)
  await expect(conversation(page).getByRole('article', { name: /^Meeting Prep: Orders released today were filled/ })).toBeVisible()
  await meetingPanel(page).getByRole('textbox', { name: 'New agenda item' }).fill('ESG alternatives for the trust')
  await meetingPanel(page).getByRole('button', { name: 'Add to agenda', exact: true }).click()
  await expect(meetingPanel(page).getByRole('list', { name: 'Agenda · v2' })).toContainText('ESG alternatives for the trust')

  // 4. The meeting view, beside the live thread; Adrian holds the meeting there.
  await meetingView(page)
  await holdTheMeeting(page)
  await expect(liveThread(page)).toContainText('Meeting held · 14:00–15:15 ET · transcript received')

  // 5. The notes, beside the transcript; a citation hovered lights its line.
  await draftNotes(page)
  await page.getByRole('list', { name: 'Decisions' }).getByRole('button', { name: 'Cites t-07 · Patricia Johnson' }).hover()
  await expect(page.locator('#transcript-t-07')).toHaveAttribute('data-highlighted', 'true')

  // 6. An edit, saved; the record filed; the tasks.
  await page.getByRole('button', { name: 'Edit n-01', exact: true }).click()
  await page.getByRole('textbox', { name: 'Edit n-01', exact: true }).fill('Reviewed the rebalance and the Intel harvest.')
  await page.getByRole('button', { name: 'Save notes' }).click()
  await expect(page.getByText('Unsaved edits')).toHaveCount(0)
  await fileRecord(page)
  const filedLine = await page.getByText(/^Filed · REC-\d{4} · fingerprint [0-9A-F]{8}$/).textContent()
  const [, filedId, filedFingerprint] = /^Filed · (REC-\d{4}) · fingerprint ([0-9A-F]{8})$/.exec(filedLine ?? '') ?? []
  if (!filedId || !filedFingerprint) throw new Error(`the filed record names its id and fingerprint: ${filedLine}`)
  await expect(page.getByRole('table', { name: 'Follow-up tasks' })).toContainText('Sarah Mitchell')
  await expect(page.getByRole('table', { name: 'Follow-up tasks' })).toContainText('2 Mar 2026')

  // 7. The thread: the slip and the task list.
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await expect(conversation(page).getByRole('article', { name: 'Filed the record of the Johnson annual review' })).toBeVisible()
  await expect(conversation(page).getByRole('article', { name: 'Tasks from the filed record' })).toBeVisible()

  // 8. Robert's thread: the recap, drafted and sent.
  await openThread(page, 'Robert Johnson')
  await expect(heading(page)).toHaveText('Robert Johnson')
  await askForRecap(page)
  await letterDraft(page).getByRole('button', { name: 'Send to Robert and Patricia' }).click()
  await expect(conversation(page)).toContainText('What we decided:')
  await expect(context(page).getByRole('region', { name: 'Audit trail' })).toContainText('Message sent to Robert Johnson and Patricia Johnson')

  // 9. Robert sees his question, the recap and its slip — nothing of the firm's record.
  await viewAs(page, 'Robert Johnson · Client')
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  await expect(conversation(page)).toContainText('When is my annual review this year?')
  // Not the whole body: the presenter's "View as" select names every person. Not the whole main area either: the roster
  // under his title names Sarah, a member of Robert's thread; the messages must not.
  const firmRecord = new RegExp(`transcript|agenda|Meeting Notes|follow-up|filed record|${filedId}|${filedFingerprint}|fingerprint [0-9A-F]{8}`, 'i')
  await expect(conversation(page).getByRole('listitem').last()).not.toContainText(/REC-\d{4}|fingerprint|UTC|Audit details/)
  await expect(conversation(page).getByRole('listitem').last()).not.toContainText(filedId)
  await expect(page.getByRole('main')).not.toContainText(firmRecord)
  await expect(page.getByRole('main')).not.toContainText('Mike Chen')
  await expect(conversation(page)).not.toContainText('Sarah Mitchell')
  await expect(page.getByLabel('Who can see')).not.toContainText('Mark Davis')
  await expect(context(page)).not.toContainText(firmRecord)
  await expect(context(page).getByRole('region', { name: 'Records' })).not.toContainText(/Sarah Mitchell|Mike Chen/)
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)

  // 10. Mark: the recap in Supervision with its provenance; the filing in the Archive.
  await viewAs(page, 'Mark Davis · Compliance')
  await deskLink(page, 'Supervision').click()
  await page.getByRole('navigation', { name: 'Supervision queue' }).getByRole('link', { name: /^Message to Robert Johnson/ }).click()
  await expect(page.getByRole('region', { name: 'Correspondence · Message to Robert Johnson' })).toContainText(/from the filed record REC-\d{4} · fingerprint/)
  // The Supervision page takes the whole main area (no thread list, so no Firm pane): the Archive from the command line.
  await goTo(page, 'Archive')
  await expect(page.getByRole('table', { name: 'Archive' })).toContainText('Filed the record of the Johnson annual review')

  // 11. Adrian: the household and a client from the command line.
  await viewAs(page, 'Adrian Hale · Advisor')
  await goTo(page, 'Household · Johnson')
  await expect(heading(page)).toHaveText('Johnson Household')
  await expect(page.getByRole('list', { name: 'Past meetings' })).toContainText('FILED')
  await expect(page.getByRole('table', { name: 'Open wash-sale windows' })).toContainText('27 Mar 2026')
  await goTo(page, 'Client · Patricia Johnson')
  await expect(heading(page)).toHaveText('Patricia Johnson')
  await expect(page.getByRole('main')).toContainText('Conservative · score 35 of 100 · assessed 15 Sep 2025')
})
