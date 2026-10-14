import { expectNoAxeViolations } from './axe'
import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  PELL_ACCEPTANCE_TEXT, advanceTo, approveProspect, askAgentNamed, context, conversation, deliver, deskLink, goTo, heading, recordTheCoffee,
  reviseToTwoTaxYears, sendToHer, settle, threadLink, viewAs, visit, type Theme,
} from './workspace-steps'

type Layout = 'three-panes' | 'full-width'
type Scene = { name: string; layout: Layout; open: (page: Page) => Promise<void> }

/** Form CRS at first contact, the coffee, and her reply on Thursday's jump. */
async function replied(page: Page, theme: Theme) {
  await visit(page, '/t/th-pell', theme)
  await deliver(page, 'Form CRS')
  await recordTheCoffee(page)
  await advanceTo(page, 'reply')
}

/** Her findings, v1, the staged revision, v2 approved with the best-interest record. */
async function approved(page: Page, theme: Theme) {
  await replied(page, theme)
  await threadLink(page, 'Pell · prospect work').click()
  await expect(heading(page)).toHaveText('Pell · prospect work')
  await askAgentNamed(page, 'Prospect Profile')
  await expect(conversation(page).getByRole('article', { name: /^Prospect Profile: Dr\. Amanda Pell's answers/ })).toBeVisible()
  await askAgentNamed(page, 'Transfer-In')
  await expect(conversation(page).getByRole('article', { name: /^Transfer-In: Stryker Corp\. is a concentrated position/ })).toBeVisible()
  await askAgentNamed(page, 'Proposal Agent')
  await expect(page.getByRole('table', { name: 'Transfer in kind · v1' })).toBeVisible()
  await reviseToTwoTaxYears(page)
  await approveProspect(page, 2)
}

async function sent(page: Page, theme: Theme) {
  await approved(page, theme)
  await threadLink(page, 'Dr. Amanda Pell').click()
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await sendToHer(page, 2)
}

async function accepted(page: Page, theme: Theme) {
  await sent(page, theme)
  await advanceTo(page, 'acceptance')
}

const pellThread = async (page: Page) => { await sent(page, 'light'); await settle(page) }
const pellThreadAsHer = async (page: Page) => {
  await sent(page, 'light')
  await viewAs(page, 'Dr. Amanda Pell · Prospect')
  await expect(context(page).getByRole('region', { name: 'Your steps' })).toBeVisible()
  await settle(page)
}
const pellWork = async (page: Page) => { await approved(page, 'light'); await settle(page) }
const pellOnboarding = async (page: Page) => {
  await accepted(page, 'light')
  await threadLink(page, 'Pell · prospect work').click()
  await expect(context(page).getByRole('table', { name: 'Onboarding checklist' })).toBeVisible()
  await settle(page)
}
const prospectPage = (theme: Theme) => async (page: Page) => {
  await accepted(page, theme)
  await goTo(page, 'Prospect · Dr. Amanda Pell')
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await expect(page.getByRole('table', { name: 'Versions · Pell proposal' })).toBeVisible()
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'pell-thread-light', layout: 'three-panes', open: pellThread },
  { name: 'pell-thread-prospect-light', layout: 'three-panes', open: pellThreadAsHer },
  { name: 'pell-work-light', layout: 'three-panes', open: pellWork },
  { name: 'pell-onboarding-light', layout: 'three-panes', open: pellOnboarding },
  { name: 'prospect-page-light', layout: 'full-width', open: prospectPage('light') },
  { name: 'prospect-page-dark', layout: 'full-width', open: prospectPage('dark') },
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

    if (scene.layout === 'full-width') {
      test('the page takes the full width: no thread list', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 900 })
        await scene.open(page)
        await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
      })
    }
  })
}

test('one presenter takes Dr. Pell from first contact to an onboarding opened; she sees only her thread; Mark sees the record', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. The Brief's Today opens her thread.
  await visit(page, '/t/th-brief', 'light')
  await page.getByRole('region', { name: 'Today' }).getByRole('link', { name: 'Open her thread' }).click()
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await expect(page.getByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toBeVisible()

  // 2. Form CRS at first contact; the coffee; her reply on Thursday's jump.
  await deliver(page, 'Form CRS')
  await expect(conversation(page).getByRole('article', { name: 'Delivered · Form CRS (client relationship summary)' })).toBeVisible()
  await recordTheCoffee(page)
  await advanceTo(page, 'reply')
  await expect(conversation(page).getByRole('article', { name: 'Dr. Amanda Pell · Shared two statements: Fidelity taxable brokerage and TIAA 403(b).' })).toBeVisible()

  // 3. The internal thread: findings, v1, a revision, v2 approved with the best-interest record.
  await threadLink(page, 'Pell · prospect work').click()
  await expect(conversation(page).getByRole('article', { name: /^Note · Coffee with Dr\. Amanda Pell/ })).toContainText('15:30–16:30 ET')
  await askAgentNamed(page, 'Prospect Profile')
  await askAgentNamed(page, 'Transfer-In')
  await expect(conversation(page).getByRole('article', { name: 'Transfer-In: Rollover of the former employer 403(b): asked about; comparison to follow.' })).toBeVisible()
  await askAgentNamed(page, 'Proposal Agent')
  await expect(page.getByRole('region', { name: 'Proposal · Pell proposal' })).toContainText('Prices as of 25 Feb 2026 close.')
  await reviseToTwoTaxYears(page)
  await expect(context(page).getByRole('region', { name: 'Approval · Pell proposal' })).toContainText('Staying self-directed')
  await approveProspect(page, 2)
  await expect(context(page).getByRole('region', { name: 'Follow-up' })).toContainText('comparison to follow')

  // 4. Her thread: v2 sent, with ADV 2A delivered in the same record, before it.
  await threadLink(page, 'Dr. Amanda Pell').click()
  await sendToHer(page, 2)
  await expect(conversation(page).getByRole('article', { name: 'Delivered · Form ADV Part 2A (firm brochure)' })).toBeVisible()

  // 5. View as her: only her thread, her slips in her terms, nothing of the firm's work.
  await viewAs(page, 'Dr. Amanda Pell · Prospect')
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await expect(conversation(page)).toContainText('Dear Dr. Pell,')
  const firmWork = /binding|Supervisory review|Prospect Profile|Transfer-In|best-interest|Balanced Growth|Staying self-directed|prospect work|scripted|presenter|Mike Chen/i
  await expect(page.getByRole('main')).not.toContainText(firmWork)
  await expect(context(page)).not.toContainText(firmWork)
  await expect(context(page).getByRole('region', { name: 'Your steps' })).toContainText('Accept the proposal')

  // 6. Back as Adrian: her acceptance on Monday's jump; the onboarding it opened.
  await viewAs(page, 'Adrian Hale · Advisor')
  await advanceTo(page, 'acceptance')
  await expect(conversation(page)).toContainText(PELL_ACCEPTANCE_TEXT)
  await threadLink(page, 'Pell · prospect work').click()
  const checklist = context(page).getByRole('table', { name: 'Onboarding checklist' })
  await expect(checklist).toContainText('CIP identity verification')
  await expect(checklist).toContainText('OFAC screen')
  await expect(checklist).toContainText('Trusted contact (custodian account form, FINRA Rule 4512)')
  await expect(checklist).toContainText('2026-03-09')
  await deliver(page, 'ADV Part 2B')
  await deliver(page, 'privacy notice')

  // 7. Mark: the proposal in Supervision with its provenance; every act in the Archive under her name.
  await viewAs(page, 'Mark Davis · Compliance')
  await deskLink(page, 'Supervision').click()
  await page.getByRole('navigation', { name: 'Supervision queue' }).getByRole('link', { name: /^Message to Dr\. Amanda Pell/ }).click()
  await expect(page.getByRole('main')).toContainText('The approved v2 of the prospect proposal')
  await goTo(page, 'Archive')
  await page.getByLabel('Client or prospect').selectOption({ label: 'Dr. Amanda Pell' })
  const archive = page.getByRole('table', { name: 'Archive' })
  await expect(archive).toContainText('Approved v2 of the Pell proposal, with the best-interest record')
  await expect(archive).toContainText('Dr. Amanda Pell accepted v2 of the Pell proposal')
  await expect(archive).toContainText('via a scripted clock jump')

  // 8. The prospect page, from the command line.
  await viewAs(page, 'Adrian Hale · Advisor')
  await goTo(page, 'Prospect · Dr. Amanda Pell')
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await expect(page.getByRole('list', { name: 'Stage history' })).toContainText('Onboarding')
  await expect(page.getByRole('table', { name: 'Disclosures delivered' })).toContainText('Privacy notice')
})

test('the presenter performs her steps through the shortcut and as her; each is recorded as her, marked', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await visit(page, '/t/th-pell', 'light')
  await expect(context(page).getByRole('button', { name: 'Advance to her reply · Thu 26 Feb 09:10 ET' })).toBeDisabled()
  await recordTheCoffee(page)
  const demo = context(page).getByRole('region', { name: 'Demo · act as Dr. Pell' })
  await demo.getByRole('button', { name: 'Answer her questionnaire' }).click()
  await page.getByRole('dialog', { name: 'Answer her questionnaire as Dr. Pell?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(conversation(page).getByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toBeVisible()
  await viewAs(page, 'Dr. Amanda Pell · Prospect')
  await context(page).getByRole('region', { name: 'Your steps' }).getByRole('button', { name: 'Share my statements' }).click()
  await expect(conversation(page).getByRole('article', { name: /^Dr\. Amanda Pell · Shared two statements/ })).toBeVisible()
  await viewAs(page, 'Adrian Hale · Advisor')
  await expect(context(page).getByRole('button', { name: /^Advance to her reply/ })).toHaveCount(0)
  await expect(context(page).getByRole('button', { name: 'Advance to her acceptance · Mon 2 Mar 10:00 ET' })).toBeDisabled()
})
