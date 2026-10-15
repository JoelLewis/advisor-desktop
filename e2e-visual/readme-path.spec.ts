import { test, expect } from '@playwright/test'
import { expectNoAxeViolations } from './axe'
import {
  PELL_ACCEPTANCE_TEXT, advanceTo, approve, approveProspect, askAgentNamed, askForRecap, context, conversation, deliver, deskLink,
  draftNotes, embedOf, fileRecord, heading, holdTheMeeting, letterDraft, meetingPanel, recordTheCoffee, releaseByShortcut,
  resolveBreakNamed, reviseToTwoTaxYears, runPrep, sendToHer, takeFindingTo, takeToTeamThread, threadLink, viewAs, visit,
} from './workspace-steps'

/** The README's guided path, click for click and in its order, from a fresh session as Adrian Hale; axe runs at every dialog. */
test("the README's five-minute path, end to end", async ({ page }) => {
  test.setTimeout(600_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const back = () => page.getByRole('link', { name: 'Back to the thread' }).click()
  const home = () => page.getByRole('banner').getByRole('link', { name: 'Advisor Desktop' }).click()
  const path = page.getByRole('list', { name: 'The five-minute path' }).getByRole('listitem')
  const axe = expectNoAxeViolations

  // The home page: the eight steps, the first one next.
  await visit(page, '/', 'light')
  await expect(path).toHaveCount(8)
  await expect(path.first()).toContainText('NEXT')

  // 1. The Brief: Today, Needs a decision, Context.
  await threadLink(page, 'Brief').click()
  await expect(heading(page)).toHaveText('Brief')
  const today = page.getByRole('region', { name: 'Today' })
  await expect(today).toContainText('14:00–15:15 ET')
  await expect(today).toContainText('Coffee with Dr. Amanda Pell · Form CRS due before it (firm policy)')
  await expect(page.getByRole('region', { name: 'Needs a decision' })).toContainText('Intel Corp.')

  // 2. The Johnson rebalance and harvest: the finding to the team thread, v1, v2 "harvest only", v3 in the workbench, approved.
  const intc = conversation(page).getByRole('article', { name: /^Harvest Scanner: The remaining Intel Corp\. shares can be sold at a loss today/ })
  await takeFindingTo(intc, 'Johnson Rebalance Review')
  await threadLink(page, 'Johnson Rebalance Review').click()
  await context(page).getByRole('button', { name: 'Ask Proposal Agent', exact: true }).click()
  const embed = embedOf(page)
  await expect(embed.getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
  await embed.getByRole('button', { name: 'Revise' }).click()
  const revise = page.getByRole('dialog', { name: 'Revise the proposal' })
  await expect(revise).toBeVisible()
  await axe(page)
  await revise.getByRole('checkbox', { name: 'Harvest only: sell only lots at a loss' }).check()
  await revise.getByRole('button', { name: 'Ask Proposal Agent to revise' }).click()
  await expect(embed.getByRole('table', { name: 'Proposal legs · v2' })).toBeVisible()
  await embed.getByRole('link', { name: 'Workbench' }).click()
  await expect(heading(page)).toHaveText('Johnson rebalance')
  await page.getByRole('grid', { name: 'Legs · v2' }).getByRole('row', { name: /^QAI/ }).focus()
  await page.keyboard.press('x')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByRole('group', { name: 'Draft version' }).getByText('Saved as v3 · posted to the thread.')).toBeVisible()
  await back()
  await approve(page, 3)

  // 3. The compliance release as Mark Davis, through the presenter's shortcut.
  await releaseByShortcut(page, axe)

  // 4. The blotter and the moved book.
  await page.getByRole('link', { name: 'Open in the blotter' }).first().click()
  await expect(heading(page)).toHaveText('Blotter')
  await expect(page.getByRole('table', { name: 'Orders' })).toContainText('FILLED')
  await back()
  await context(page).getByRole('link', { name: /^Robert Johnson Individual/ }).click()
  await expect(page.getByRole('table', { name: 'Holdings' }).getByRole('row', { name: /^INTC/ })).toHaveCount(0)
  await back()
  await threadLink(page, 'Brief').click()
  await expect(page.getByRole('region', { name: 'Needs a decision' })).not.toContainText('Intel Corp.')
  await expect(page.getByRole('region', { name: 'Context' })).toContainText('Intel Corp.')

  // 5. The Johnson annual review: prep, hold, notes, file, recap.
  await page.getByRole('region', { name: 'Today' }).getByRole('link', { name: 'Open the meeting thread' }).click()
  await expect(heading(page)).toHaveText('Johnson annual review')
  await runPrep(page)
  await meetingPanel(page).getByRole('textbox', { name: 'New agenda item' }).fill('ESG alternatives for the trust')
  await meetingPanel(page).getByRole('button', { name: 'Add to agenda', exact: true }).click()
  await expect(meetingPanel(page).getByRole('list', { name: 'Agenda · v2' })).toBeVisible()
  await meetingPanel(page).getByRole('link', { name: /Open the meeting view/ }).click()
  await holdTheMeeting(page, axe)
  await draftNotes(page)
  await fileRecord(page, axe)
  await back()
  await threadLink(page, 'Robert Johnson').click()
  await askForRecap(page)
  await letterDraft(page).getByRole('button', { name: 'Send to Robert' }).click()
  await expect(conversation(page)).toContainText('What we decided:')

  // 6. Dr. Pell, from first contact to an onboarding opened.
  await threadLink(page, 'Brief').click()
  await page.getByRole('region', { name: 'Today' }).getByRole('link', { name: 'Open her thread' }).click()
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await deliver(page, 'Form CRS', axe)
  await recordTheCoffee(page, axe)
  await advanceTo(page, 'reply')
  await threadLink(page, 'Pell · prospect work').click()
  await askAgentNamed(page, 'Prospect Profile')
  await askAgentNamed(page, 'Transfer-In')
  await askAgentNamed(page, 'Proposal Agent')
  await reviseToTwoTaxYears(page, axe)
  await approveProspect(page, 2, axe)
  await threadLink(page, 'Dr. Amanda Pell').click()
  await sendToHer(page, 2, axe)
  await advanceTo(page, 'acceptance')
  await expect(conversation(page)).toContainText(PELL_ACCEPTANCE_TEXT)
  await threadLink(page, 'Pell · prospect work').click()
  await expect(context(page).getByRole('table', { name: 'Onboarding checklist' })).toBeVisible()

  // 7. The reference views, under Reference in the thread list; each returns through the header's Advisor Desktop link.
  for (const view of ['Billing', 'Models', 'Practice', 'Blotter'] as const) {
    await deskLink(page, view).click()
    await expect(heading(page)).toHaveText(view)
    await expect(page.getByRole('heading', { name: 'Methods & sources' })).toBeVisible()
    await home()
  }
  await deskLink(page, 'Reconciliation').click()
  await resolveBreakNamed(page, 'brk-002', 'Timing difference', 'Schwab confirmed the 24 Feb cash sweep posted after the file was cut.', axe)
  await home()
  await deskLink(page, 'Risk').click()
  await takeToTeamThread(page, 'Patel Digital Assets Account')
  await home()
  await expect(path.nth(7)).toContainText('NEXT')

  // 8. View as Robert: one thread, his own — his question, the recap and its record.
  await viewAs(page, 'Robert Johnson · Client')
  const threads = page.getByRole('navigation', { name: 'Threads' }).getByRole('link')
  await expect(threads).toHaveCount(1)
  await expect(threads).toHaveAccessibleName('Robert Johnson')
  await threads.click()
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  await expect(conversation(page)).toContainText('What we decided:')
})
