import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('keeps a custom font size alongside a color', () => {
    expect(cn('text-label uppercase', 'text-ink')).toBe('text-label uppercase text-ink')
    expect(cn('text-body', 'text-signal-ink')).toBe('text-body text-signal-ink')
  })
  it('still resolves a real conflict within one group', () => {
    expect(cn('text-ink', 'text-ink-2')).toBe('text-ink-2')
    expect(cn('bg-ink', 'bg-face')).toBe('bg-face')
  })
  it('resolves conflicts between two font sizes', () => {
    expect(cn('text-table', 'text-label')).toBe('text-label')
  })
})
