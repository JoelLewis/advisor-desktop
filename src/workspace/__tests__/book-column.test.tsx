import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { bookModeKey } from '@/workspace/shell/book-mode'

const book = () => screen.getByRole('navigation', { name: 'Book' })

async function viewAs(option: string) {
  const user = userEvent.setup()
  await screen.findByRole('option', { name: option })
  await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), option)
}

describe('the Book', () => {
  it('opens on Households: the switch, the Brief, the queue, then every household', async () => {
    renderRoutes(routes, '/')
    const queue = await within(book()).findByRole('list', { name: 'Needs you today' })
    expect(within(book()).getByRole('button', { name: 'Households' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(book()).getByRole('link', { name: 'Brief' })).toHaveAttribute('href', '/t/th-brief')
    const first = within(queue).getAllByRole('link')[0]
    expect(first).toHaveAttribute('href', '/households/hh-001')
    expect(first).toHaveTextContent('Johnson Household')
    expect(first).toHaveTextContent('Decision waiting · Robert waiting')
    expect(first).toHaveTextContent('review 14:00 ET')
    expect(first).toHaveTextContent('OUT OF BAND')
    expect(within(book()).getByRole('list', { name: 'All households' })).toBeInTheDocument()
    expect(within(book()).getByRole('heading', { name: 'Firm' })).toBeInTheDocument()
  })

  it('a household with nothing due shows no status line and no markers', async () => {
    renderRoutes(routes, '/')
    const all = await within(book()).findByRole('list', { name: 'All households' })
    const obrien = within(all).getByRole('link', { name: /O'Brien Household/ })
    expect(obrien.querySelector('[data-part="status-line"]')).toBeNull()
    expect(obrien.querySelector('[data-tone]')).toBeNull()
  })

  it('switches to Conversations, remembered for this viewer only', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/')
    await user.click(await within(book()).findByRole('button', { name: 'Conversations' }))
    expect(await within(book()).findByRole('heading', { name: 'Just me' })).toBeInTheDocument()
    expect(localStorage.getItem(bookModeKey('user-001'))).toBe('conversations')
    await viewAs('Sarah Mitchell · Client service')
    expect(await within(book()).findByRole('list', { name: 'Needs you today' })).toBeInTheDocument()
    await viewAs('Adrian Hale · Advisor')
    expect(await within(book()).findByRole('heading', { name: 'Just me' })).toBeInTheDocument()
  })

  it('gives an outsider no switch: their one conversation, under Threads', async () => {
    renderRoutes(routes, '/')
    await viewAs('Robert Johnson · Client')
    const threads = await screen.findByRole('navigation', { name: 'Threads' })
    expect(within(threads).queryByRole('group', { name: 'Show' })).toBeNull()
    expect(await within(threads).findAllByRole('link')).toHaveLength(1)
  })
})
