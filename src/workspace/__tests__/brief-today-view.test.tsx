import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BriefTodayView } from '@/workspace/thread/BriefTodayView'
import { MOCK_NOW_ISO } from '@/lib/clock'

const today = (at: string) => ({ kind: 'brief_today' as const, id: 'msg-btoday', threadId: 'th-brief', at, lines: [] })
const shown = (at: string) => render(<MemoryRouter><BriefTodayView today={today(at)} /></MemoryRouter>)

describe("the Brief's Today heading", () => {
  it('is Today on the frozen day', () => {
    shown(MOCK_NOW_ISO)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^Today$/)
  })
  it('names the day once the clock has moved off it', () => {
    shown('2026-02-26T14:10:00.000Z')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^Today · Thu 26 Feb$/)
  })
  it('stays Today late on the frozen New York day, past UTC midnight', () => {
    shown('2026-02-26T03:30:00.000Z')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^Today$/)
  })
})
