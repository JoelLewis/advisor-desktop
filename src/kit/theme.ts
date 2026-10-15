export type ThemeChoice = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'ws-theme'
const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system']

function isThemeChoice(v: unknown): v is ThemeChoice {
  return typeof v === 'string' && (CHOICES as readonly string[]).includes(v)
}

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeChoice(stored) ? stored : 'system'
  } catch {
    // Storage blocked (private window, policy): follow the system theme.
    return 'system'
  }
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice)
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

/** What the inline script in index.html sets before first paint: `?theme`, then the stored choice; "system" sets nothing. */
export function initialThemeAttribute(search: string, stored: string | null): 'light' | 'dark' | null {
  const fromUrl = themeFromSearch(search)
  if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl
  return stored === 'light' || stored === 'dark' ? stored : null
}

const LABEL: Record<Exclude<ThemeChoice, 'system'>, string> = { light: 'Theme: light', dark: 'Theme: dark' }
export const themeLabel = (choice: ThemeChoice, systemDark: boolean) =>
  choice === 'system' ? `Theme: system (${systemDark ? 'dark' : 'light'})` : LABEL[choice]
