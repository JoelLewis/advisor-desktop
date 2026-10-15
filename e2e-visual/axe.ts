import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** The WCAG 2.0–2.2 A and AA rules, as the 14 October audit ran them. No rule is ever disabled to make a scene pass. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const found = violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact ?? 'no impact'}): ${n.target.join(' ')}`))
  expect(found, 'axe violations').toEqual([])
}
