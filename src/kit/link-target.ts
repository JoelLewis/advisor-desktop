/**
 * A link that stands on its own, outside a run of text, is a target as a button is: never under 24px (WCAG 2.5.8)
 * and 44px under a finger. The gap stands in for the space before a trailing ↗, which a flex box would drop.
 */
export const LINK_TARGET = 'inline-flex min-h-6 items-center gap-1 coarse:min-h-11'

/**
 * The same floor inside a dense table cell, where a 24px box would lengthen every row. The link keeps the height of its
 * text; an invisible box 4px wider on every side is the target, so the 24px is met without moving the row. Still 44px
 * under a finger, where phone tables keep their larger rows.
 */
export const TABLE_LINK_TARGET = 'relative inline-flex items-center gap-1 before:absolute before:-inset-1 before:content-[\'\'] coarse:min-h-11'
