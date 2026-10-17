import type { Figure } from '@/types/workspace'
import { figureText } from '@/kit/figure-text'

/** The digits a claim types by hand: whatever is left once each of its own figures, as the kit writes it, is taken out. */
export function handTypedDigits(claim: string, figures: readonly Figure[]): string[] {
  const parts = figures.map(figureText).sort((a, b) => b.length - a.length)
  const rest = parts.reduce((text, part) => text.split(part).join(' '), claim)
  return rest.match(/\d+/g) ?? []
}
