import { test, expect, type Page } from '@playwright/test'

async function openKit(page: Page, theme: 'light' | 'dark', width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ colorScheme: theme })
  await page.goto(`/kit?theme=${theme}`)
  await expect(page.locator('[data-kit-ready="true"]')).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
}

for (const theme of ['light', 'dark'] as const) {
  test(`kit baseline · ${theme}`, async ({ page }) => {
    await openKit(page, theme, 1440)
    await page.screenshot({ path: `docs/superpowers/visual/kit-${theme}.png`, fullPage: true, animations: 'disabled', caret: 'hide' })
  })
}

test('no page-level horizontal scroll at 1024px', async ({ page }) => {
  await openKit(page, 'light', 1024)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

const LABEL_SELECTOR = 'th, [data-status], [data-tone], [data-stamp], [data-part="label"], [data-visibility] span'

// Text extent (Range over the contents) against the element's own box and its nearest overflow-clipping ancestor.
async function clippedLabels(page: Page) {
  return page.evaluate((selector) => {
    const clipper = (el: HTMLElement): HTMLElement | null => {
      for (let node = el.parentElement; node; node = node.parentElement) {
        if (getComputedStyle(node).overflowX !== 'visible') return node
      }
      return null
    }
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const range = document.createRange()
      range.selectNodeContents(el)
      const text = range.getBoundingClientRect()
      if (text.width === 0) continue
      const own = el.getBoundingClientRect()
      const ancestor = clipper(el)?.getBoundingClientRect()
      const beyondOwn = text.right > own.right + 1 || text.left < own.left - 1
      const beyondAncestor = ancestor !== undefined && (text.right > ancestor.right + 1 || text.left < ancestor.left - 1)
      if (beyondOwn || beyondAncestor) out.push(el.textContent ?? '')
    }
    return out
  }, LABEL_SELECTOR)
}

for (const [theme, width] of [['light', 1440], ['dark', 1440], ['light', 1024]] as const) {
  test(`no clipped labels · ${theme} ${width}px`, async ({ page }) => {
    await openKit(page, theme, width)
    expect(await clippedLabels(page)).toEqual([])
  })
}
