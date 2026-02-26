const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)

/** Returns platform-aware modifier key labels */
export function usePlatform() {
  return {
    isMac,
    /** "⌘" on Mac, "Ctrl" on Windows/Linux */
    mod: isMac ? '⌘' : 'Ctrl',
    /** "⌥" on Mac, "Alt" on Windows/Linux */
    alt: isMac ? '⌥' : 'Alt',
    /** "⇧" on Mac, "Shift" on Windows/Linux */
    shift: isMac ? '⇧' : 'Shift',
    /** Format a shortcut like "⌘K" or "Ctrl+K" */
    shortcut: (key: string) => (isMac ? `⌘${key}` : `Ctrl+${key}`),
  }
}
