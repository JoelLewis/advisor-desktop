import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tag } from '@/kit/tag/Tag'

it('renders its word with a tone', () => {
  render(<Tag tone="hatch">NO MARKET</Tag>)
  expect(screen.getByText('NO MARKET')).toHaveAttribute('data-tone', 'hatch')
})

it('stays on one line unless asked to wrap inside a narrow column', () => {
  render(<><Tag>OPEN</Tag><Tag wrap>AWAITING HER SIGNATURE</Tag></>)
  expect(screen.getByText('OPEN')).toHaveClass('whitespace-nowrap')
  expect(screen.getByText('AWAITING HER SIGNATURE')).toHaveClass('whitespace-normal', 'max-w-full')
  expect(screen.getByText('AWAITING HER SIGNATURE')).not.toHaveClass('whitespace-nowrap')
})
