import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'
import { store } from '@/mocks/data/workspace-store'
import { PHONE_LAYOUT_QUERY } from '@/workspace/shell/phone-panes'

const refuseSends = () =>
  server.use(http.post('/api/workspace/acts', () => HttpResponse.json({ code: 'STALE', message: 'This letter is stale.' }, { status: 409 })))

const layoutIsPhone = (phone: boolean) =>
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({ matches: phone && query === PHONE_LAYOUT_QUERY, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }))

const draftsInRobertsThread = () => store().drafts.filter((d) => d.clientThreadId === 'th-robert')

const open = async () => {
  renderRoutes(routes, '/t/th-robert')
  return screen.findByRole('textbox', { name: 'Message to Robert Johnson' })
}

describe('the client-visible composer', () => {
  afterEach(() => { sessionStorage.clear(); layoutIsPhone(false) })

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

  it('a refused send keeps the text in the field and in Drafts, and says where it went', async () => {
    refuseSends()
    const user = userEvent.setup()
    const field = await open()
    await user.type(field, 'Kept, not sent.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Saved as a draft in Drafts; not sent: This letter is stale.')
    expect(await screen.findByRole('article', { name: 'Draft · not sent' })).toHaveTextContent('Kept, not sent.')
    expect(field).toHaveValue('Kept, not sent.')
  })

  it('after a refused send, Save draft keeps the one draft rather than saving a second', async () => {
    refuseSends()
    const user = userEvent.setup()
    const field = await open()
    await user.type(field, 'Kept, not sent.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    await screen.findByRole('article', { name: 'Draft · not sent' })
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(field).toHaveValue(''))
    expect(draftsInRobertsThread().map((d) => d.body)).toEqual(['Kept, not sent.'])
  })

  it('after a refused send, an edit then Send revises the one draft and sends it', async () => {
    refuseSends()
    const user = userEvent.setup()
    const field = await open()
    await user.type(field, 'First try.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    await screen.findByRole('article', { name: 'Draft · not sent' })
    server.resetHandlers()
    await user.type(field, ' Second try.')
    await user.click(within(field.closest('form')!).getByRole('button', { name: 'Send to Robert' }))
    const messages = screen.getByRole('list', { name: 'Messages' })
    await waitFor(() => expect(within(messages).getByText('First try. Second try.')).toBeInTheDocument())
    expect(draftsInRobertsThread()).toEqual([])
    expect(store().acts).toHaveLength(1)
  })

  it('on a phone, where Drafts sits behind the Context tab, a refused send leaves the text in view', async () => {
    layoutIsPhone(true)
    refuseSends()
    const user = userEvent.setup()
    const field = await open()
    expect(document.getElementById('context-column')!.className).toContain('max-narrow:hidden')
    await user.type(field, 'Kept, not sent.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Saved as a draft in Drafts; not sent: This letter is stale.')
    expect(screen.getByRole('main')).toContainElement(alert)
    expect(screen.getByRole('main').className).not.toContain('max-narrow:hidden')
    expect(field).toHaveValue('Kept, not sent.')
    await user.click(within(screen.getByRole('navigation', { name: 'Panes' })).getByRole('button', { name: 'Context' }))
    expect(await within(document.getElementById('context-column')!).findByRole('article', { name: 'Draft · not sent' })).toHaveTextContent('Kept, not sent.')
  })

  it('Save draft stays focusable while a send is in flight', async () => {
    server.use(http.post('/api/workspace/acts', async () => { await new Promise((r) => setTimeout(r, 200)); return HttpResponse.json({ code: 'STALE', message: 'This letter is stale.' }, { status: 409 }) }))
    const user = userEvent.setup()
    await user.type(await open(), 'Hold on.')
    await user.click(screen.getByRole('button', { name: 'Send to Robert' }))
    const save = screen.getByRole('button', { name: 'Save draft' })
    await waitFor(() => expect(save).toHaveAttribute('aria-disabled', 'true'))
    expect(save).not.toBeDisabled()
    await screen.findByRole('alert')
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
