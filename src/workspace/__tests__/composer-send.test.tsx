import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'

const open = async () => {
  renderRoutes(routes, '/t/th-robert')
  return screen.findByRole('textbox', { name: 'Message to Robert Johnson' })
}

describe('the client-visible composer', () => {
  afterEach(() => sessionStorage.clear())

  it('names the client, and its primary button sends', async () => {
    const user = userEvent.setup()
    await user.type(await open(), 'Your review is booked for Friday.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    const messages = await screen.findByRole('list', { name: 'Messages' })
    await waitFor(() => expect(within(messages).getByText('Your review is booked for Friday.')).toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Message to Robert Johnson' })).toHaveValue('')
  })

  it('Save draft keeps it for later, unsent', async () => {
    const user = userEvent.setup()
    await user.type(await open(), 'Draft for later.')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByRole('article', { name: 'Draft · not sent' })).toHaveTextContent('Draft for later.')
  })

  it('a refused send keeps the draft and says it was not sent', async () => {
    server.use(http.post('/api/workspace/acts', () => HttpResponse.json({ code: 'STALE', message: 'This letter is stale.' }, { status: 409 })))
    const user = userEvent.setup()
    const field = await open()
    await user.type(field, 'Kept, not sent.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Saved as a draft; not sent: This letter is stale.')
    expect(await screen.findByRole('article', { name: 'Draft · not sent' })).toHaveTextContent('Kept, not sent.')
    expect(field).toHaveValue('')
  })

  it('a team thread posts to the team', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    expect(await screen.findByRole('button', { name: 'Post to the team' })).toBeInTheDocument()
  })

  it('a viewer who may draft but not send gets only Save draft', async () => {
    sessionStorage.setItem('ws-viewer', 'user-002')
    await open()
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send to Robert' })).toBeNull()
  })
})
