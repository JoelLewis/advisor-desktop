import { test, expect } from '@playwright/test'
import { SCREENSHOT, pageOverflowX } from './layout-checks'
import { expectNoAxeViolations } from './axe'
import { deskLink, openPhonePane, settle, visit } from './workspace-steps'

test('the command line at 1440×600 shows its title, its field and Close · baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 })
  await visit(page, '/', 'light')
  await settle(page)
  await page.keyboard.press('/')
  const dialog = page.getByRole('dialog', { name: 'Command line' })
  const box = await dialog.boundingBox()
  if (!box) throw new Error('the command line is not rendered')
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(600)
  await expect(dialog.getByRole('combobox', { name: 'Go to' })).toBeInViewport()
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeInViewport()
  await expect(page).toHaveScreenshot('command-line-1440x600-light.png', { ...SCREENSHOT, fullPage: false })
  await expectNoAxeViolations(page)
})

test('the Resolve dialog at 320 px reaches its title, its select and Confirm · baseline', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await visit(page, '/', 'light')
  await openPhonePane(page, 'Threads')
  await deskLink(page, 'Reconciliation').click()
  await page.getByRole('button', { name: 'Resolve brk-002', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Resolve brk-002?' })
  await expect(dialog.getByRole('heading', { name: 'Resolve brk-002?' })).toBeInViewport()
  await dialog.getByLabel('Resolution').scrollIntoViewIfNeeded()
  await expect(dialog.getByLabel('Resolution')).toBeInViewport()
  await dialog.getByRole('button', { name: 'Confirm' }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeInViewport()
  expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
  await dialog.evaluate((el) => el.scrollTo(0, 0))
  await settle(page)
  await expect(page).toHaveScreenshot('resolve-dialog-320-light.png', { ...SCREENSHOT, fullPage: false })
  await expectNoAxeViolations(page)
})
