import { describe, it, expect } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { AnnouncerProvider } from '@/kit/announcer/AnnouncerProvider'
import { useAnnounce } from '@/kit/announcer/use-announce'

let say: (m: string) => void = () => undefined
function Speaker() { say = useAnnounce(); return null }
const region = () => document.querySelector('[data-part="announcer"]')
const frame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))

describe('the announcer', () => {
  it('is one polite status region, mounted empty', () => {
    render(<AnnouncerProvider><Speaker /></AnnouncerProvider>)
    expect(screen.getByRole('status')).toBe(region())
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(region()).toBeEmptyDOMElement()
  })
  it('writes a message a frame after clearing, so the same words twice are said twice', async () => {
    render(<AnnouncerProvider><Speaker /></AnnouncerProvider>)
    act(() => say('Drift Monitor reported in the thread.'))
    await frame()
    expect(region()).toHaveTextContent('Drift Monitor reported in the thread.')
    act(() => say('Drift Monitor reported in the thread.'))
    expect(region()).toBeEmptyDOMElement()
    await frame()
    expect(region()).toHaveTextContent('Drift Monitor reported in the thread.')
  })
  it('empties when its reset key changes, so one viewer\'s words are not left for the next', async () => {
    const { rerender } = render(<AnnouncerProvider resetKey="a"><Speaker /></AnnouncerProvider>)
    act(() => say('Sent to the client.'))
    await frame()
    expect(region()).toHaveTextContent('Sent to the client.')
    rerender(<AnnouncerProvider resetKey="b"><Speaker /></AnnouncerProvider>)
    expect(region()).toBeEmptyDOMElement()
  })
  it('drops a message still waiting for its frame when the reset key changes', async () => {
    const { rerender } = render(<AnnouncerProvider resetKey="a"><Speaker /></AnnouncerProvider>)
    act(() => say('Sent to the client.'))
    rerender(<AnnouncerProvider resetKey="b"><Speaker /></AnnouncerProvider>)
    await frame()
    expect(region()).toBeEmptyDOMElement()
  })
  it('refuses to be used outside its provider', () => {
    expect(() => render(<Speaker />)).toThrow('useAnnounce must be used inside AnnouncerProvider')
  })
})
