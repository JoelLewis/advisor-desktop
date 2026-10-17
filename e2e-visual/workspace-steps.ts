import { expect, type Locator, type Page } from '@playwright/test'

export type Theme = 'light' | 'dark'

export async function settle(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: /^(Loading|Updating|Saving)/ })).toHaveCount(0, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  // No hover or focus ring in a baseline: the pointer rests off every control and nothing holds focus.
  await page.mouse.move(0, 0)
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
}

async function load(page: Page, path: string, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme })
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}theme=${theme}`)
}

export async function visit(page: Page, path: string, theme: Theme) {
  await load(page, path, theme)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
}

const PHONE_PANE_REGION = { Threads: '#thread-list', Thread: '#main', Context: '#context-column' } as const

/** The pane a phone shows: the tab bar's current one, or the page itself where there is no tab bar. */
async function shownPhonePane(page: Page): Promise<keyof typeof PHONE_PANE_REGION> {
  const current = page.locator('nav[aria-label="Panes"] [aria-current="true"]')
  if (await current.count() === 0) return 'Thread'
  const word = (await current.textContent())?.trim()
  if (word !== 'Threads' && word !== 'Thread' && word !== 'Context') throw new Error(`the pane bar shows an unknown pane "${word}"`)
  return word
}

/** A visit below 768px: the page has rendered (its h1 may wait in a hidden pane) and the pane the shell opens on shows. */
export async function visitPhone(page: Page, path: string, theme: Theme) {
  await load(page, path, theme)
  await expect(page.getByRole('heading', { level: 1, includeHidden: true })).toBeAttached({ timeout: 15_000 })
  const pane = await shownPhonePane(page)
  await expect(page.locator(PHONE_PANE_REGION[pane])).toBeVisible()
  if (pane === 'Thread') await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

/** A check run while a step's dialog is open, before the step confirms it (the README path runs axe here). */
export type AtDialog = (page: Page) => Promise<void>

async function checkOpenDialog(dialog: Locator, atDialog: AtDialog | undefined) {
  if (!atDialog) return
  await expect(dialog).toBeVisible()
  await atDialog(dialog.page())
}

export const heading = (page: Page) => page.getByRole('heading', { level: 1 })
export const conversation = (page: Page) => page.getByRole('list', { name: 'Messages' })
export const context = (page: Page) => page.getByRole('complementary', { name: 'Details' })
export const threadLink = (page: Page, name: string) => page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name, exact: true })
export const embedOf = (page: Page) => page.getByRole('region', { name: 'Proposal · Johnson rebalance' })
export const approvalOf = (page: Page) => context(page).getByRole('region', { name: 'Approval · Johnson rebalance' })
export const letterDraft = (page: Page) => context(page).getByRole('article', { name: 'Draft · not sent' })

export async function askProposalAgent(page: Page, theme: Theme) {
  await visit(page, '/t/th-johnson-review', theme)
  await context(page).getByRole('button', { name: 'Ask Proposal Agent', exact: true }).click()
  await expect(embedOf(page).getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
}

/** Robert Johnson's accounts as a whole stay within his tolerance after each proposal in the stories, so the panel chooses this reason for him. */
const SUITABILITY_REASON = "Robert Johnson's accounts as a whole stay within tolerance (asset location)"

export async function approve(page: Page, version: number) {
  const approval = approvalOf(page)
  await approval.getByRole('checkbox', { name: `I reviewed every leg of v${version} and its pre-trade check results.` }).check()
  const reason = approval.getByRole('group', { name: 'Suitability reason' }).getByRole('radio', { name: SUITABILITY_REASON })
  await expect(reason).toBeChecked()
  await reason.check()
  await approval.getByRole('button', { name: `Approve v${version}` }).click()
  await expect(approval).toContainText(`v${version} is approved`)
  await expect(approval).toContainText('PENDING COMPLIANCE RELEASE')
}

export async function askForLetter(page: Page) {
  await threadLink(page, 'Robert Johnson').click()
  await expect(heading(page)).toHaveText('Robert Johnson')
  await context(page).getByRole('button', { name: 'Ask Client Letter Agent', exact: true }).click()
  await expect(letterDraft(page)).toContainText('Dear Robert,')
}

export async function sendLetter(page: Page) {
  await letterDraft(page).getByRole('button', { name: 'Send to Robert' }).click()
  await expect(conversation(page)).toContainText('Dear Robert,')
  await expect(letterDraft(page)).toHaveCount(0)
}

/** On a phone the shell shows one pane at a time; the tab bar under the header switches them. */
export const openPhonePane = (page: Page, name: 'Threads' | 'Thread' | 'Context') =>
  page.getByRole('navigation', { name: 'Panes' }).getByRole('button', { name, exact: true }).click()

export const viewAs = (page: Page, label: string) => page.getByLabel('View as').selectOption({ label })
/** A firm surface from the Firm pane at the top of the thread list. */
export const deskLink = (page: Page, name: 'Supervision' | 'Archive' | 'Billing' | 'Reconciliation' | 'Risk' | 'Models' | 'Practice' | 'Blotter') =>
  page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name, exact: true })

/** The presenter's shortcut beside pending staged orders: Mark's default release, confirmed. */
export async function releaseByShortcut(page: Page, atDialog?: AtDialog) {
  const panel = approvalOf(page)
  await panel.getByRole('button', { name: 'Demo · act as Mark Davis' }).click()
  const dialog = page.getByRole('dialog', { name: /^Release v\d+ as Mark Davis\?$/ })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByRole('button', { name: 'Confirm' }).click()
  await expect(panel).toContainText('Released by compliance; filled at the day\'s prices.')
}

/** The meeting thread's context panel. */
export const meetingPanel = (page: Page): Locator => context(page).getByRole('region', { name: 'Meeting' })

/** Meeting Prep's findings and agenda v1 — from the meeting thread's panel or the meeting view, wherever the button is. */
export async function runPrep(page: Page) {
  await page.getByRole('button', { name: 'Run prep', exact: true }).click()
  await expect(page.getByRole('list', { name: 'Agenda · v1' })).toBeVisible()
}

export async function holdTheMeeting(page: Page, atDialog?: AtDialog) {
  await page.getByRole('button', { name: 'Demo · hold the meeting', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Hold the meeting?' })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByRole('button', { name: 'Hold the meeting', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Draft notes', exact: true })).toBeVisible()
}

export async function draftNotes(page: Page) {
  await page.getByRole('button', { name: 'Draft notes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'File the record', exact: true })).toBeVisible()
}

export async function fileRecord(page: Page, atDialog?: AtDialog) {
  await page.getByRole('button', { name: 'File the record', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /^File the record of the .+\?$/ })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText(/^Filed · REC-\d{4}/).first()).toBeVisible()
}

export async function askForRecap(page: Page) {
  await context(page).getByRole('button', { name: 'Ask Client Letter Agent for the recap', exact: true }).click()
  await expect(letterDraft(page)).toContainText('What you asked us:')
}

/** The command line: nothing holds focus, then "/" and the destination's label. */
export async function goTo(page: Page, destination: string) {
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
  await page.keyboard.press('/')
  await page.getByRole('combobox', { name: 'Go to' }).fill(destination)
  await page.keyboard.press('Enter')
}

const PELL_REPLY_TEXT = 'Thank you for the coffee. Here are my answers to the questionnaire and my two statements.'
export const PELL_ACCEPTANCE_TEXT = "I've read the proposal and I'd like to go ahead."
const JUMP_LABEL = { reply: 'Demo · skip to her reply · Thu 26 Feb 09:10 ET', acceptance: 'Demo · skip to her acceptance · Mon 2 Mar 10:00 ET' } as const

/** A disclosure from her thread's timeline (or the onboarding checklist), confirmed as a record. */
export async function deliver(page: Page, short: 'Form CRS' | 'ADV Part 2A' | 'ADV Part 2B' | 'privacy notice', atDialog?: AtDialog) {
  await context(page).getByRole('button', { name: `Deliver ${short}`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: `Deliver ${short} to Dr. Amanda Pell?` })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByRole('button', { name: 'Confirm' }).click()
  await expect(context(page).getByRole('button', { name: `Deliver ${short}`, exact: true })).toHaveCount(0)
}

export async function recordTheCoffee(page: Page, atDialog?: AtDialog) {
  const clock = context(page).getByRole('region', { name: 'Demo · clock' })
  await clock.getByRole('button', { name: 'Record the coffee' }).click()
  const dialog = page.getByRole('dialog', { name: 'Record the coffee' })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByRole('button', { name: 'Record', exact: true }).click()
  await expect(clock).toContainText('Coffee recorded')
}

export async function advanceTo(page: Page, to: 'reply' | 'acceptance') {
  await context(page).getByRole('button', { name: JUMP_LABEL[to] }).click()
  await expect(conversation(page)).toContainText(to === 'reply' ? PELL_REPLY_TEXT : PELL_ACCEPTANCE_TEXT)
}

export async function askAgentNamed(page: Page, name: string) {
  await context(page).getByRole('region', { name: 'Ask an agent' }).getByRole('button', { name: `Ask ${name}`, exact: true }).click()
}

export async function reviseToTwoTaxYears(page: Page, atDialog?: AtDialog) {
  const proposal = page.getByRole('region', { name: 'Proposal · Pell proposal' })
  await proposal.getByRole('button', { name: 'Revise' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revise the Pell proposal' })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByLabel('Phased sale of the concentrated stock').selectOption('2')
  await dialog.getByRole('button', { name: 'Ask for v2' }).click()
  await expect(proposal.getByRole('table', { name: 'Phased sale over two tax years · v2' })).toBeVisible()
}

export async function approveProspect(page: Page, version: number, atDialog?: AtDialog) {
  const approval = context(page).getByRole('region', { name: 'Approval · Pell proposal' })
  await approval.getByRole('checkbox', { name: `I reviewed v${version}: its model, its transfer plan, its fees and the best-interest record.` }).check()
  await approval.getByRole('button', { name: `Approve v${version}` }).click()
  const dialog = page.getByRole('dialog', { name: `Approve v${version} of the Pell proposal?` })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByRole('button', { name: 'Confirm' }).click()
  await expect(approval).toContainText(`v${version} is approved`)
}

export async function sendToHer(page: Page, version: number, atDialog?: AtDialog) {
  await context(page).getByRole('region', { name: 'Proposal' }).getByRole('button', { name: `Send v${version} to Dr. Pell` }).click()
  const dialog = page.getByRole('dialog', { name: `Send v${version} to Dr. Pell?` })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByRole('button', { name: 'Confirm' }).click()
  await expect(conversation(page)).toContainText('Dear Dr. Pell,')
}

/** Resolve a reconciliation break as a record, from the reconciliation view. */
export async function resolveBreakNamed(page: Page, breakId: string, resolution: string, rationale: string, atDialog?: AtDialog) {
  await page.getByRole('button', { name: `Resolve ${breakId}`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: `Resolve ${breakId}?` })
  await checkOpenDialog(dialog, atDialog)
  await dialog.getByLabel('Resolution').selectOption({ label: resolution })
  await dialog.getByLabel('Rationale').fill(rationale)
  await dialog.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByRole('main')).toContainText(/Resolved · REC-\d{4}/)
}

/** A row of a reference view, shared to its team thread; returns once the link to the thread shows. */
export async function shareToTeamThread(page: Page, rowLabel: string) {
  await page.getByRole('button', { name: `Share ${rowLabel} to a team thread`, exact: true }).click()
  await expect(page.getByRole('link', { name: /^In / }).first()).toBeVisible()
}

/** A finding shared to a thread through its "Share to" menu. */
export async function shareFindingTo(finding: Locator, threadTitle: string) {
  await finding.getByRole('button', { name: 'Share to', exact: true }).click()
  await finding.getByRole('menu', { name: 'Share to' }).getByRole('menuitem', { name: threadTitle, exact: true }).click()
  await expect(finding.getByText(`Shared to ${threadTitle}.`)).toBeVisible()
}
