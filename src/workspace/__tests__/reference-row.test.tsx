import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes, renderWithProviders } from '@/test/render'
import { takeToTeamThread } from '@/services/reference'
import { TakeToTeamThread } from '@/workspace/reference/TakeToTeamThread'

describe('a quoted row in a team thread', () => {
  it('reads as a card from its view, with its figures, its source and the way back', async () => {
    await takeToTeamThread('user-001', 'risk', 'acc-002')
    renderRoutes(routes, '/t/th-johnson-review')
    const card = await screen.findByRole('article', { name: "From Risk: Robert Johnson Individual sits above Robert Johnson's risk tolerance." })
    expect(within(card).getByRole('link', { name: 'Risk' })).toHaveAttribute('href', '/accounts/acc-002/risk?from=th-johnson-review')
    expect(card).toHaveTextContent('taken by Adrian Hale')
    expect(card).toHaveTextContent('Risk score')
    expect(card).toHaveTextContent('VaR, one month, 95%')
  })
})

describe('the Share to team thread button', () => {
  it('takes the row once and then links to the thread', async () => {
    renderWithProviders(<TakeToTeamThread view="risk" rowId="acc-045" rowLabel="Patel Digital Assets Account" />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Share Patel Digital Assets Account to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Risk · Patel Digital Assets Account' })).toHaveAttribute('href', '/t/th-ref-0001')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
