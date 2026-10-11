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

it('is a labelled list with one item per source, including bare sources', () => {
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
