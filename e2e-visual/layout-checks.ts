import type { Page } from '@playwright/test'

export const SCREENSHOT = { fullPage: true, animations: 'disabled', caret: 'hide', maxDiffPixels: 0, threshold: 0 } as const

export async function pageOverflowX(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

const LABEL_SELECTOR = 'th, [data-status], [data-tone], [data-stamp], [data-part="label"], [data-visibility] span'

// Visible text extent (a Range over each text node, leaving out screen-reader-only text, which is laid out
// at full width but clipped to nothing) against the element's own box and its nearest overflow-clipping ancestor.
export async function clippedLabels(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const visibleTextExtent = (el: HTMLElement): { left: number; right: number; width: number } => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let left = Infinity
      let right = -Infinity
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest('.sr-only')) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        const rect = range.getBoundingClientRect()
        if (rect.width === 0) continue
        left = Math.min(left, rect.left)
        right = Math.max(right, rect.right)
      }
      return right < left ? { left: 0, right: 0, width: 0 } : { left, right, width: right - left }
    }
    const clipper = (el: HTMLElement): HTMLElement | null => {
      for (let node = el.parentElement; node; node = node.parentElement) {
        if (getComputedStyle(node).overflowX !== 'visible') return node
      }
      return null
    }
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const text = visibleTextExtent(el)
      if (text.width === 0) continue
      const own = el.getBoundingClientRect()
      const clippingElement = clipper(el)
      // A table that overflows is a labeled, keyboard-scrollable region (DataTable): text past its edge is reachable, not lost.
      const scrollsSideways = clippingElement?.matches('[role="region"][tabindex="0"]') ?? false
      const ancestor = scrollsSideways ? undefined : clippingElement?.getBoundingClientRect()
      const beyondOwn = text.right > own.right + 1 || text.left < own.left - 1
      const beyondAncestor = ancestor !== undefined && (text.right > ancestor.right + 1 || text.left < ancestor.left - 1)
      if (beyondOwn || beyondAncestor) out.push(el.textContent ?? '')
    }
    return out
  }, LABEL_SELECTOR)
}
