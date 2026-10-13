import { it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Unbroken } from '@/kit/unbroken/Unbroken'

it('keeps each record id and ISO date on one line, and the text whole', () => {
  const { container } = render(<p><Unbroken text="From the filed record (REC-0003), due 2026-03-02 · fingerprint 1A2B3C4D" /></p>)
  expect(container).toHaveTextContent('From the filed record (REC-0003), due 2026-03-02 · fingerprint 1A2B3C4D')
  const kept = [...container.querySelectorAll('span.whitespace-nowrap')].map((s) => s.textContent)
  expect(kept).toEqual(['REC-0003', '2026-03-02'])
  for (const span of container.querySelectorAll('span.whitespace-nowrap')) expect(span).toHaveClass('tabular')
})

it('leaves text without an id or date as it is', () => {
  const { container } = render(<p><Unbroken text="Approve a proposal first." /></p>)
  expect(container.querySelector('p')!.innerHTML).toBe('Approve a proposal first.')
})
