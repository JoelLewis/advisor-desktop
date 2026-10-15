/**
 * A link that stands on its own, outside a run of text, is a target as a button is: never under 24px (WCAG 2.5.8)
 * and 44px under a finger. The gap stands in for the space before a trailing ↗, which a flex box would drop.
 */
export const LINK_TARGET = 'inline-flex min-h-6 items-center gap-1 coarse:min-h-11'

/** The invisible box, 4px past the element on every side, that is a dense table cell's 24px target without lengthening its row. */
export const TABLE_HIT_AREA = "relative before:absolute before:-inset-1 before:content-['']"

/**
 * The same floor for a link inside a dense table cell, where a 24px box would lengthen every row. The link keeps the
 * height of its text and the hit area is the target. Still 44px under a finger, where phone tables keep their larger rows.
 */
export const TABLE_LINK_TARGET = `${TABLE_HIT_AREA} inline-flex items-center gap-1 coarse:min-h-11`
