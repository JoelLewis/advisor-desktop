import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Page } from '@/kit/page/Page'

it('renders exactly one h1, a focusable title and a skip link to main', () => {
  render(<Page title="Component kit" eyebrow="Advisor Desktop"><p>Body</p></Page>)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1')
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
})
