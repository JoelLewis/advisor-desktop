/**
 * A link that stands on its own, outside a run of text, is a target as a button is: never under 24px (WCAG 2.5.8)
 * and 44px under a finger. The gap stands in for the space before a trailing ↗, which a flex box would drop.
 */
export const LINK_TARGET = 'inline-flex min-h-6 items-center gap-1 coarse:min-h-11'
