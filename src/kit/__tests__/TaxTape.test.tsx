import { it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { MINUS, MeasureError } from '@/kit/measure'

const figures = { gains: 122_388, losses: -45_850, netShortTerm: 0, netLongTerm: 76_538, grossTax: 29_128, netTax: 18_216,
  scope: "Nets this proposal's legs only.", rateBasis: 'Federal rates incl. 3.8% NIIT; state tax excluded.' }

function valueOf(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt, dt *' }).closest('dt') as HTMLElement
  return term.nextElementSibling as HTMLElement
}

it('pairs every label with its own value and unit', () => {
  render(<TaxTape {...figures} />)
  expect(screen.getByRole('region', { name: 'Tax effect estimate' })).toBeInTheDocument()
  const expected: [string, string][] = [
    ['Gains realized', '+122,388'], ['Losses realized', `${MINUS}45,850`], ['Net realized', '+76,538'],
    ['Net, long-term', '+76,538'], ['Net, short-term', '0'],
    ['Tax on gains before netting', '29,128'], ['Reduced by netting the losses', `${MINUS}10,912`],
    ['Estimated net tax', '18,216'],
  ]
  for (const [label, value] of expected) {
    const dd = valueOf(label)
    expect(dd.tagName).toBe('DD')
    expect(within(dd).getByText(value)).toBeInTheDocument()
    expect(within(dd).getByText('USD')).toBeInTheDocument()
  }
  expect(screen.getByText("Nets this proposal's legs only.")).toBeInTheDocument()
  expect(screen.getByText(/state tax excluded/)).toBeInTheDocument()
})

it('nests the term split under Net realized, not under Losses', () => {
  render(<TaxTape {...figures} />)
  expect(valueOf('Net realized').previousElementSibling).toHaveTextContent(/^Net realized$/)
  expect(valueOf('Losses realized').previousElementSibling).toHaveTextContent(/^Losses realized$/)
  for (const term of ['Net, long-term', 'Net, short-term']) {
    expect(valueOf(term).previousElementSibling).toHaveTextContent(`of which ${term}`)
  }
})

it('keeps the description list valid: every child is a row holding one term and its value', () => {
  const { container } = render(<TaxTape {...figures} />)
  const rows = [...container.querySelector('dl')!.children]
  expect(rows).toHaveLength(8)
  for (const row of rows) {
    expect(row.tagName).toBe('DIV')
    expect([...row.children].map((c) => c.tagName)).toEqual(['DT', 'DD'])
  }
})

it('refuses to render a tape that does not reconcile', () => {
  const swallow = (event: ErrorEvent) => event.preventDefault()
  window.addEventListener('error', swallow)
  const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  expect(() => render(<TaxTape {...figures} netLongTerm={70_000} />)).toThrow(MeasureError)
  spy.mockRestore()
  window.removeEventListener('error', swallow)
})

it('tolerates a one dollar rounding difference', () => {
  render(<TaxTape {...figures} netLongTerm={76_539} />)
  expect(screen.getByText('+76,539')).toBeInTheDocument()
})
