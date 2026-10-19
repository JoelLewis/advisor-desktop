import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { showConversationsFor } from '@/test/book-mode'

describe('the practice words', () => {
  it('the list says Firm and Reports; the Agents page says what each agent can and cannot do', async () => {
    showConversationsFor()
    renderRoutes(routes, '/t/th-johnson-review')
    const list = await screen.findByRole('navigation', { name: 'Book' })
    expect(await within(list).findByRole('heading', { name: 'Firm' })).toBeInTheDocument()
    expect(await within(list).findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(within(list).queryByRole('heading', { name: 'Agents' })).toBeNull()
    expect(within(list).getByRole('link', { name: 'Agents' })).toHaveAttribute('href', '/agents')
  })
  it('the context column is Details, with Related records', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    const details = await screen.findByRole('complementary', { name: 'Details' })
    expect(await within(details).findByRole('heading', { name: 'Related records' })).toBeInTheDocument()
  })
  it('a Brief finding is shared, and says where it went', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/t/th-brief')
    const finding = (await screen.findAllByRole('article', { name: /^Harvest Scanner: The remaining Intel/ }))[0]!
    await user.click(within(finding).getByRole('button', { name: 'Share to' }))
    await user.click(within(finding).getByRole('menuitem', { name: 'Johnson Rebalance Review' }))
    expect(await within(finding).findByText('Shared to Johnson Rebalance Review.')).toBeInTheDocument()
  })
})
