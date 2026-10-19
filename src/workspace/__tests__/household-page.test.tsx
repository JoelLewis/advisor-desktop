import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'

const main = () => screen.getByRole('main')

describe('the Johnson household page', () => {
  it('names each member with their own tolerance and their own accounts as a whole', async () => {
    renderRoutes(routes, '/households/hh-001')
    const members = await within(main()).findByRole('list', { name: 'Members' })
    expect(members).toHaveTextContent('Robert Johnson')
    expect(members).toHaveTextContent('Moderate tolerance, 41–55 pts · accounts as a whole 51 pts')
    expect(members).toHaveTextContent('Moderate Conservative tolerance, 26–40 pts · accounts as a whole 34 pts')
    expect(within(members).getAllByText('WITHIN TOLERANCE')).toHaveLength(2)
    expect(main()).toHaveTextContent('Managed')
    expect(main()).toHaveTextContent('Held away')
  })

  it('shows holdings by asset class against the household target, and opens a class onto the accounts holding it', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    const table = await within(main()).findByRole('table', { name: 'Holdings by asset class' })
    expect(within(table).getByRole('columnheader', { name: /Target/ })).toBeInTheDocument()
    const opener = within(table).getByRole('button', { name: 'US Equity' })
    expect(opener).toHaveAttribute('aria-expanded', 'false')
    await user.click(opener)
    expect(opener).toHaveAttribute('aria-expanded', 'true')
    const holders = within(main()).getByRole('region', { name: 'US Equity · accounts holding it' })
    expect(opener).toHaveAttribute('aria-controls', holders.id)
    expect(holders).toHaveTextContent('Robert Johnson · Individual (…3847)')
    expect(holders).toHaveTextContent('working: buy 200 QQQ, limit 480.00')
    expect(holders).toHaveTextContent("outside the firm's view")
  })

  it('opens and closes a class from the keyboard, and focus stays on its button', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    const table = await within(main()).findByRole('table', { name: 'Holdings by asset class' })
    const opener = within(table).getByRole('button', { name: 'US Equity' })
    opener.focus()
    await user.keyboard('{Enter}')
    expect(within(main()).getByRole('region', { name: 'US Equity · accounts holding it' })).toBeInTheDocument()
    expect(opener).toHaveFocus()
    await user.keyboard(' ')
    expect(within(main()).queryByRole('region', { name: 'US Equity · accounts holding it' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('lists what needs a decision, tasks with their owners, the meetings and the last client contact', async () => {
    renderRoutes(routes, '/households/hh-001')
    expect(await within(main()).findByRole('list', { name: 'Needs a decision' })).toHaveTextContent("Growth sits above Robert Johnson's Moderate tolerance")
    expect(within(main()).getByRole('list', { name: 'Needs a decision' })).toHaveTextContent('Robert Johnson · Individual (…3847): US Equity is outside its tolerance band')
    expect(within(main()).getByRole('list', { name: 'Tasks and open items' })).toHaveTextContent('Mark Davis · Compliance')
    expect(within(main()).getByRole('list', { name: 'Upcoming meetings' })).toHaveTextContent('14:00–15:15 ET')
    const contact = within(main()).getByRole('region', { name: 'Last client contact' })
    expect(contact).toHaveTextContent('Robert Johnson wrote at 07:01 ET, in their conversation')
    expect(within(contact).getByRole('link', { name: 'Open the conversation with Robert Johnson' })).toBeInTheDocument()
    expect(contact).toHaveTextContent('Robert waiting')
  })

  it('is not found for an outsider', async () => {
    sessionStorage.setItem('ws-viewer', 'cli-002')
    renderRoutes(routes, '/households/hh-001')
    expect(await screen.findByRole('heading', { level: 1, name: /not found/i })).toBeInTheDocument()
  })

  it("notes the local currency of a non-USD account, and lists a custom mandate outside the target", async () => {
    renderRoutes(routes, '/households/hh-002')
    const accounts = await within(main()).findByRole('table', { name: 'Household accounts' })
    expect(within(accounts).getByRole('row', { name: /Chen-Wong HK Equity Account \(…0142\) · HKD account/ })).toBeInTheDocument()
    expect(within(accounts).queryAllByText(/ · USD account/)).toHaveLength(0)
    const outside = within(main()).getByRole('list', { name: 'Outside the target' })
    expect(outside).toHaveTextContent('Chen-Wong HK Equity Account (…0142)')
    expect(outside).toHaveTextContent('custom mandate, outside the target')
  })
})
