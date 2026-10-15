import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SourceChips } from '@/kit/source-chips/SourceChips'

it('lists what a finding relies on; a single as-of shared by every source is said once, beside the label', () => {
  render(<SourceChips sources={[{ label: 'Drift calculation', detail: 'acc-002 vs Growth', asOf: '2026-02-25T12:00:00Z', confidence: 0.92 }]} />)
  expect(screen.getByText('Relies on')).toBeInTheDocument()
  expect(screen.getByText('as of 25 Feb 07:00 ET')).toBeInTheDocument()
  expect(screen.getByRole('listitem')).not.toHaveTextContent('as of')
  expect(screen.getByText('confidence 92')).toBeInTheDocument()
})

it('puts the as-of on each chip only where the sources differ', () => {
  render(<SourceChips sources={[{ label: 'Lots', asOf: '2026-02-25T12:00:00Z' }, { label: 'Held away', asOf: '2025-12-01T05:00:00Z' }, { label: 'Policy' }]} />)
  const items = within(screen.getByRole('list', { name: 'Relies on' })).getAllByRole('listitem')
  expect(items.map((i) => i.textContent)).toEqual(['Lotsas of 25 Feb 07:00 ET', 'Held awayas of 1 Dec 00:00 ET', 'Policy'])
  expect(document.querySelector('[data-part="shared-as-of"]')).toBeNull()
})

it('is a labeled list with one item per source, including bare sources', () => {
  render(<SourceChips sources={[{ label: 'Drift calculation', asOf: '2026-02-25T12:00:00Z' }, { label: 'Drift calculation', asOf: '2026-02-26T12:00:00Z' }, { label: 'Policy' }]} />)
  const list = screen.getByRole('list', { name: 'Relies on' })
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(items[2]).toHaveTextContent(/^Policy$/)
})

it('renders nothing without sources', () => {
  const { container } = render(<SourceChips sources={[]} />)
  expect(container).toBeEmptyDOMElement()
})

it('draws separators in CSS before each part, clipped at the start of a line, never as text', () => {
  render(<SourceChips sources={[{ label: 'Rebalance preview', detail: 'Robert Johnson Individual', asOf: '2026-02-25T12:00:00Z' }]} />)
  const item = screen.getByRole('listitem')
  expect(item).not.toHaveTextContent('·')
  const parts = [...item.querySelectorAll('[data-part="chip-part"]')]
  expect(parts.map((p) => p.textContent)).toEqual(['Rebalance preview', 'Robert Johnson Individual'])
  for (const part of parts) expect(part.className).toContain("before:content-['·'_/_'']")
  for (const part of parts) {
    expect(part.className).toContain('max-w-full')
    expect(part.className).not.toContain('whitespace-nowrap')
  }
  const row = parts[0]!.parentElement!
  expect(row.className).toContain('-ml-4')
  expect(row.parentElement!.className).toContain('overflow-hidden')
})

it('says a date-only as-of as the date it states, never the evening before in ET', () => {
  render(<SourceChips sources={[{ label: 'Held-away assets · Vanguard · as reported by the client', asOf: '2025-12-01' }, { label: 'Statement', asOf: '2026-01-31' }]} />)
  const items = within(screen.getByRole('list', { name: 'Relies on' })).getAllByRole('listitem')
  expect(items.map((i) => i.textContent)).toEqual(['Held-away assets · Vanguard · as reported by the clientas of 1 Dec 2025', 'Statementas of 31 Jan 2026'])
})

it('says a shared date-only as-of once, as a date', () => {
  render(<SourceChips sources={[{ label: 'Financial plan', asOf: '2025-12-01' }]} />)
  expect(screen.getByText('as of 1 Dec 2025')).toBeInTheDocument()
})
