import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useJumpKeys } from '@/kit/keyboard/use-jump-keys'
import { applyTheme, readThemeChoice, saveThemeChoice, themeFromSearch, type ThemeChoice } from '@/kit/theme'

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<ThemeChoice, string> = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' }

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(() => themeFromSearch(window.location.search) ?? readThemeChoice())
  const next = () => {
    const c = NEXT[choice]
    applyTheme(c); saveThemeChoice(c); setChoice(c)
  }
  useJumpKeys('theme', [{ key: 't', label: 'Cycle theme', run: next }])
  return <Button rank="secondary" onClick={next}>{LABEL[choice]}</Button>
}
