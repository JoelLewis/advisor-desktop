import { afterEach, describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/workspace/shell/ThemeToggle'
import { AnnouncerProvider } from '@/kit/announcer/AnnouncerProvider'
import { KeyboardProvider } from '@/kit/keyboard/KeyboardProvider'

const renderToggle = () => render(<AnnouncerProvider><KeyboardProvider destinations={[]}><ThemeToggle /></KeyboardProvider></AnnouncerProvider>)

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
  localStorage.clear()
})

async function cycle() {
  const user = userEvent.setup()
  renderToggle()
  const seen: (string | undefined)[] = []
  for (const label of ['Theme: system', 'Theme: light', 'Theme: dark']) {
    await user.click(screen.getByRole('button', { name: label }))
    seen.push(document.documentElement.dataset.theme)
  }
  return seen
}

describe('ThemeToggle', () => {
  it('starts from the theme the URL applied', () => {
    window.history.pushState({}, '', '/kit?theme=dark')
    renderToggle()
    window.history.pushState({}, '', '/')
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeTruthy()
  })
  it('cycles system, light, dark, system and sets data-theme', async () => {
    expect(await cycle()).toEqual(['light', 'dark', undefined])
    expect(screen.getByRole('button', { name: 'Theme: system' })).toBeTruthy()
  })
  it('still works when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(await cycle()).toEqual(['light', 'dark', undefined])
  })
  it('t cycles the theme from the keyboard and is listed in the key sheet', async () => {
    const user = userEvent.setup()
    renderToggle()
    await user.keyboard('t')
    expect(screen.getByRole('button', { name: 'Theme: light' })).toBeTruthy()
    await user.keyboard('?')
    expect(screen.getByRole('dialog', { name: 'Keyboard' })).toHaveTextContent('Cycle theme')
  })
  it('is a quiet text control, and a change made by key is announced', async () => {
    renderToggle()
    expect(screen.getByRole('button', { name: 'Theme: system' })).toHaveAttribute('data-rank', 'quiet')
    await userEvent.keyboard('t')
    await act(() => new Promise<void>((r) => requestAnimationFrame(() => r())))
    expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent('Theme: light')
  })
})
