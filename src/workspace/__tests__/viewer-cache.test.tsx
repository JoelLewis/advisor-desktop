import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { createAppQueryClient } from '@/app/query-client'
import { renderRoutes } from '@/test/render'
import { OUTSIDER_THREAD_TITLE } from '@/workspace/people/roster'

// The production query client (five-minute staleTime): a cached read for one viewer must not
// outlive another viewer's write once the first viewer is switched back to.
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const conversation = () => screen.getByRole('list', { name: 'Messages' })
const context = () => within(screen.getByRole('complementary', { name: 'Thread context' }))

async function viewAs(option: string) {
  const user = userEvent.setup()
  const select = await screen.findByRole('combobox', { name: 'View as' })
  await screen.findByRole('option', { name: option })
  await user.selectOptions(select, option)
}

describe('switching viewer with the production cache', () => {
  it("Robert sees the message Adrian sent while Robert's thread was cached", async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/t/th-robert', createAppQueryClient())
    await screen.findByRole('heading', { level: 1, name: OUTSIDER_THREAD_TITLE })
    await waitFor(() => expect(conversation()).toHaveTextContent('When is my annual review this year?'))

    await viewAs('Adrian Hale · Advisor')
    const user = userEvent.setup()
    await user.type(await screen.findByRole('textbox', { name: 'Draft' }), 'Your review is booked for next month.')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    const draft = await context().findByRole('article', { name: 'Draft · not sent' })
    await user.click(within(draft).getByRole('button', { name: 'Send to Robert' }))
    await waitFor(() => expect(conversation()).toHaveTextContent('Your review is booked for next month.'))

    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument())
    await waitFor(() => expect(conversation()).toHaveTextContent('Your review is booked for next month.'))
  })

  it("Mark sees the finding Adrian's agent run posted while Mark's view of the thread was cached", async () => {
    viewAsOnLoad('cco-001')
    renderRoutes(routes, '/t/th-johnson-review', createAppQueryClient())
    await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    await waitFor(() => expect(within(conversation()).getAllByRole('listitem')).toHaveLength(3))
    expect(within(conversation()).queryByRole('article', { name: /^Drift Monitor: / })).toBeNull()

    await viewAs('Adrian Hale · Advisor')
    const ask = await context().findByRole('button', { name: 'Ask Drift Monitor' })
    await userEvent.setup().click(ask)
    expect(await within(conversation()).findAllByRole('article', { name: /^Drift Monitor: / })).not.toHaveLength(0)

    await viewAs('Mark Davis · Compliance')
    expect(screen.getByRole('combobox', { name: 'View as' })).toHaveValue('cco-001')
    expect(await within(conversation()).findAllByRole('article', { name: /^Drift Monitor: / })).not.toHaveLength(0)
  })
})
