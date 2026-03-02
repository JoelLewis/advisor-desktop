import { Sun, Moon, Monitor } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ThemeMode } from '@/store/ui-store'

type ThemeOption = {
  label: string
  description: string
  icon: LucideIcon
  next: ThemeMode
}

export const THEME_CONFIG: Record<ThemeMode, ThemeOption> = {
  light:  { label: 'Light',  description: 'Always use light theme',  icon: Sun,     next: 'dark' },
  dark:   { label: 'Dark',   description: 'Always use dark theme',   icon: Moon,    next: 'system' },
  system: { label: 'System', description: 'Follow OS preference',    icon: Monitor, next: 'light' },
}
