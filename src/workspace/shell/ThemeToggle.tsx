import { useEffect, useState } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { useJumpKeys } from '@/kit/keyboard/use-jump-keys'
import { useSystemDark } from '@/kit/use-system-dark'
import { THEME_STORAGE_KEY, applyTheme, readThemeChoice, saveThemeChoice, themeFromSearch, themeLabel, type ThemeChoice } from '@/kit/theme'

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(() => themeFromSearch(window.location.search) ?? readThemeChoice())
  const systemDark = useSystemDark()
  const announce = useAnnounce()
  const next = () => {
    const c = NEXT[choice]
    applyTheme(c); saveThemeChoice(c); setChoice(c)
    announce(themeLabel(c, systemDark))
  }
  useJumpKeys('theme', [{ key: 't', label: 'Cycle theme', run: next }])
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return
      const c = readThemeChoice()
      applyTheme(c)
      setChoice(c)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return <Button rank="quiet" onClick={next}>{themeLabel(choice, systemDark)}</Button>
}
