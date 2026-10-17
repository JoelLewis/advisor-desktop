import { test, expect } from '@playwright/test'
import { pageOverflowX } from './layout-checks'
import { context, embedOf, heading, openPhonePane, settle, visitPhone } from './workspace-steps'

for (const width of [320, 390]) {
  for (const path of ['/', '/t/th-brief', '/billing', '/practice', '/models/mod-005', '/blotter', '/risk', '/reconciliation']) {
    test(`${path} does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await visitPhone(page, path, 'light')
      await settle(page)
      expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
    })
  }
  test(`the workbench does not scroll sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await visitPhone(page, '/t/th-johnson-review', 'light')
    // On a phone the context column is a pane of its own: open it to ask, then return to the thread.
    await openPhonePane(page, 'Context')
    await context(page).getByRole('button', { name: 'Ask Proposal Agent', exact: true }).click()
    await openPhonePane(page, 'Thread')
    await expect(embedOf(page).getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
    await embedOf(page).getByRole('link', { name: 'Workbench' }).click()
    await expect(heading(page)).toHaveText('Johnson rebalance')
    await settle(page)
    expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
  })
}

test('the wash-sale dates on the source chips are not clipped at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await visitPhone(page, '/t/th-brief', 'light')
  await settle(page)
  const clipped = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-part="chip-part"]')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > document.documentElement.clientWidth)
    .map((el) => el.textContent))
  expect(clipped).toEqual([])
})

test('a citation that wraps inside its chip keeps every line inside the chip at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await visitPhone(page, '/t/th-brief', 'light')
  await settle(page)
  const cut = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-part="chip-part"]')].flatMap((el) => {
    const clip = el.closest('.overflow-hidden')
    if (!clip) return [`${el.textContent}: no clipping box`]
    const range = document.createRange()
    range.selectNodeContents(el)
    const lines = [...range.getClientRects()]
    const left = clip.getBoundingClientRect().left
    return lines.some((r) => r.width > 0 && r.left < left - 0.5) ? [el.textContent] : []
  }))
  expect(cut).toEqual([])
})

test('form controls are at least 16px at 390px, so iOS does not zoom into them', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await visitPhone(page, '/', 'light')
  await settle(page)
  const sizes = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('input, select, textarea')]
    .map((el) => Number.parseFloat(getComputedStyle(el).fontSize)))
  expect(sizes.length).toBeGreaterThan(0)
  expect(sizes.filter((size) => size < 16)).toEqual([])
})
