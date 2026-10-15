export const SINGLE_KEYS_STORAGE_KEY = 'ws-single-keys'
/** How the key legend and sheet write the modifier, for either platform. */
export const MODIFIER_WORD = 'Ctrl/⌘'

export function readSingleKeys(): boolean {
  try {
    return localStorage.getItem(SINGLE_KEYS_STORAGE_KEY) !== 'off'
  } catch {
    // Storage blocked (private window, policy): the default, on.
    return true
  }
}

export function saveSingleKeys(on: boolean): void {
  try {
    localStorage.setItem(SINGLE_KEYS_STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Storage blocked: the choice holds for this page view only.
  }
}

const withModifier = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && !e.altKey

/** Ctrl/⌘+K: the command line, whatever the setting (WCAG 2.1.4 covers only single character keys). */
export const isCommandChord = (e: KeyboardEvent) => withModifier(e) && e.key.toLowerCase() === 'k'
/** Ctrl/⌘+/: the key sheet. Not Shift+?: "?" is itself a character key. */
export const isSheetChord = (e: KeyboardEvent) => withModifier(e) && e.key === '/'
