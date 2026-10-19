import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'

const column = () => screen.getByRole('complementary', { name: 'Conversations' })

describe("the household's conversations", () => {
  it('lists each with who reads it, in the Phase 9 words', async () => {
    renderRoutes(routes, '/households/hh-001')
    const list = await within(column()).findByRole('list', { name: 'Conversations about this household' })
    expect(within(list).getByRole('link', { name: /Johnson annual review/ })).toHaveTextContent("Larkfield team · Robert and Patricia can't see this")
    expect(within(list).getByRole('link', { name: /^Patricia Johnson/ })).toHaveTextContent('Patricia Johnson can read this')
  })

  it('starts a Just me conversation about the household and opens it', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    const form = await within(column()).findByRole('group', { name: 'Who reads it' })
    await user.click(within(form).getByRole('radio', { name: 'Just me' }))
    await user.type(within(column()).getByRole('textbox', { name: 'Title' }), "Patricia's models")
    await user.click(within(column()).getByRole('button', { name: 'Start the conversation' }))
    expect(await screen.findByRole('heading', { level: 1, name: "Patricia's models" })).toBeInTheDocument()
  })

  it("opens Robert's own conversation rather than making a second", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    await user.click(await within(column()).findByRole('radio', { name: 'Client conversation with Robert' }))
    await user.click(within(column()).getByRole('button', { name: 'Open the conversation' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })).toBeInTheDocument()
  })

  it("opens Patricia's own conversation rather than making a second", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    await user.click(await within(column()).findByRole('radio', { name: 'Client conversation with Patricia' }))
    await user.click(within(column()).getByRole('button', { name: 'Open the conversation' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Patricia Johnson' })).toBeInTheDocument()
  })

  it('keeps the title and says why when the start is refused', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    const tooLong = 'A'.repeat(121)
    await user.click(await within(column()).findByRole('textbox', { name: 'Title' }))
    await user.paste(tooLong)
    await user.click(within(column()).getByRole('button', { name: 'Start the conversation' }))
    expect(await within(column()).findByRole('alert')).toHaveTextContent('A title is at most 120 characters.')
    expect(within(column()).getByRole('textbox', { name: 'Title' })).toHaveValue(tooLong)
  })

  it('lists a Just me conversation it started as "Just you"', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    await user.click(await within(column()).findByRole('radio', { name: 'Just me' }))
    await user.type(within(column()).getByRole('textbox', { name: 'Title' }), 'Notes to self')
    await user.click(within(column()).getByRole('button', { name: 'Start the conversation' }))
    await screen.findByRole('heading', { level: 1, name: 'Notes to self' })
    await user.click(screen.getAllByRole('link', { name: /^Johnson Household/ })[0]!)
    const list = await within(column()).findByRole('list', { name: 'Conversations about this household' })
    expect(await within(list).findByRole('link', { name: /Notes to self/ })).toHaveTextContent('Just you')
  })
})

describe('a conversation started from the household page, over HTTP', () => {
  const start = (audience: { kind: 'private' } | { kind: 'internal' }, title: string) => fetch('/api/workspace/threads', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Viewer': 'user-001' }, body: JSON.stringify({ householdId: 'hh-001', title, audience }),
  }).then(async (r) => ((await r.json()) as { thread: { id: string } }).thread)

  it.each([['Just me', { kind: 'private' } as const], ['Larkfield team', { kind: 'internal' } as const]])('a %s thread is hidden from Robert and Patricia', async (_label, audience) => {
    const thread = await start(audience, 'Johnson estate questions')
    for (const client of ['cli-001', 'cli-002']) {
      const listed = (await (await fetch('/api/workspace/threads', { headers: { 'X-Viewer': client } })).json()) as { id: string }[]
      expect(listed.map((t) => t.id)).not.toContain(thread.id)
      expect((await fetch(`/api/workspace/threads/${thread.id}`, { headers: { 'X-Viewer': client } })).status).toBe(404)
    }
  })
})
