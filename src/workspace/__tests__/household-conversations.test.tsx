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
})
