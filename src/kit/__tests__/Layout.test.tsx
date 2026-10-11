import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Grid, MainColumn, SidePanel } from '@/kit/layout/Grid'
import { Pane } from '@/kit/layout/Pane'

it('composes a pane in the main column and a labelled side panel', () => {
  render(
    <Grid>
      <MainColumn><Pane title="Holdings" meta="10 of 10"><p>rows</p></Pane></MainColumn>
      <SidePanel label="What is being approved"><p>tape</p></SidePanel>
    </Grid>,
  )
  expect(screen.getByRole('heading', { level: 2, name: 'Holdings' })).toBeInTheDocument()
  const panel = screen.getByRole('complementary', { name: 'What is being approved' })
  expect(panel).not.toHaveAttribute('aria-label')
  expect(panel.getAttribute('aria-labelledby')).toBe(screen.getByText('What is being approved').id)
})
