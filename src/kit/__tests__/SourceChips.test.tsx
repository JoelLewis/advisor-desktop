import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SourceChips } from '@/kit/source-chips/SourceChips'

it('lists what a finding relies on, with as-of time and confidence', () => {
  render(<SourceChips sources={[{ label: 'Drift calculation', detail: 'acc-002 vs Growth', asOf: '2026-02-25T12:00:00Z', confidence: 0.92 }]} />)
  expect(screen.getByText('Relies on')).toBeInTheDocument()
  expect(screen.getByText('Drift calculation')).toBeInTheDocument()
  expect(screen.getByText('as of 2026-02-25 12:00 UTC')).toBeInTheDocument()
  expect(screen.getByText('confidence 92')).toBeInTheDocument()
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
  expect(parts.map((p) => p.textContent)).toEqual(['Rebalance preview', 'Robert Johnson Individual', 'as of 2026-02-25 12:00 UTC'])
  for (const part of parts) expect(part.className).toContain("before:content-['·'_/_'']")
  const row = parts[0]!.parentElement!
  expect(row.className).toContain('-ml-4')
  expect(row.parentElement!.className).toContain('overflow-hidden')
})
