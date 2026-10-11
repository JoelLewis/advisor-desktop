import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { MINUS } from '@/kit/measure'

it('runs gains, losses, netting and the estimate, and states scope and rate basis', () => {
  render(<TaxTape gains={122_388} losses={-45_850} netShortTerm={0} netLongTerm={76_538} grossTax={29_128} netTax={18_216}
    scope="Nets this proposal's legs only." rateBasis="Federal rates incl. 3.8% NIIT; state tax excluded." />)
  expect(screen.getByText('+122,388')).toBeInTheDocument()
  expect(screen.getByText(`${MINUS}45,850`)).toBeInTheDocument()
  expect(screen.getByText(`${MINUS}10,912`)).toBeInTheDocument()
  expect(screen.getByText('18,216')).toBeInTheDocument()
  expect(screen.getByText("Nets this proposal's legs only.")).toBeInTheDocument()
  expect(screen.getByText(/state tax excluded/)).toBeInTheDocument()
})
