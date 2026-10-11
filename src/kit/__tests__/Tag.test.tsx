import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tag } from '@/kit/tag/Tag'

it('renders its word with a tone', () => {
  render(<Tag tone="hatch">NO MARKET</Tag>)
  expect(screen.getByText('NO MARKET')).toHaveAttribute('data-tone', 'hatch')
})
