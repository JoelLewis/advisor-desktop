import type { Page } from '@playwright/test'

export const SCREENSHOT = { fullPage: true, animations: 'disabled', caret: 'hide', maxDiffPixels: 0, threshold: 0 } as const

export async function pageOverflowX(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

const LABEL_SELECTOR = 'th, [data-status], [data-tone], [data-stamp], [data-part="label"], [data-visibility] span'

// Text extent (Range over the contents) against the element's own box and its nearest overflow-clipping ancestor.
export async function clippedLabels(page: Page): Promise<string[]> {
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
