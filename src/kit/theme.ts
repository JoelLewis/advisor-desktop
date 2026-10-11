export type ThemeChoice = 'light' | 'dark' | 'system'

const KEY = 'ws-theme'
const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system']

function isThemeChoice(v: unknown): v is ThemeChoice {
  return typeof v === 'string' && (CHOICES as readonly string[]).includes(v)
}

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(KEY)
    return isThemeChoice(stored) ? stored : 'system'
  } catch {
    // Storage blocked (private window, policy): follow the system theme.
    return 'system'
  }
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    // Storage blocked: the choice applies for this page view only.
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.dataset.theme = choice
}

export function themeFromSearch(search: string): ThemeChoice | null {
  const value = new URLSearchParams(search).get('theme')
  return isThemeChoice(value) && value !== 'system' ? value : null
}
