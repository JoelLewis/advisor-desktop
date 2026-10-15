import { test, expect } from '@playwright/test'
import { pageOverflowX } from './layout-checks'
import { askProposalAgent, embedOf, heading, settle, visit } from './workspace-steps'

for (const width of [320, 390]) {
  for (const path of ['/', '/t/th-brief', '/billing', '/practice', '/models/mod-005', '/blotter', '/risk', '/reconciliation']) {
    test(`${path} does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await visit(page, path, 'light')
      await settle(page)
      expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
    })
  }
  test(`the workbench does not scroll sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await askProposalAgent(page, 'light')
    await embedOf(page).getByRole('link', { name: 'Workbench' }).click()
    await expect(heading(page)).toHaveText('Johnson rebalance')
    await settle(page)
    expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
  })
}

test('the wash-sale dates on the source chips are not clipped at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await visit(page, '/t/th-brief', 'light')
  await settle(page)
  const clipped = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-part="chip-part"]')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > document.documentElement.clientWidth)
    .map((el) => el.textContent))
  expect(clipped).toEqual([])
})
