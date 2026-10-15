import { it, expect } from 'vitest'
import { useState } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/kit/dialog/Dialog'
import { Button } from '@/kit/button/Button'
import { Page } from '@/kit/page/Page'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open keys</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Keyboard">
        <p>Press / for the command line.</p>
      </Dialog>
    </>
  )
}

it('opens with a titled dialog and returns focus to the trigger on Escape', async () => {
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Open keys' })
  await userEvent.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Keyboard' })).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  // Radix returns focus on a 0ms timer after unmount.
  await waitFor(() => expect(trigger).toHaveFocus())
})

it('falls back to the page heading when the opener left the DOM while open', async () => {
  function Removable() {
    const [open, setOpen] = useState(false)
    const [showOpener, setShowOpener] = useState(true)
    return (
      <Page title="Kit">
        {showOpener ? <Button onClick={() => setOpen(true)}>Open keys</Button> : null}
        <Button onClick={() => setShowOpener(false)}>Remove opener</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Keyboard"><p>Body</p></Dialog>
      </Page>
    )
  }
  render(<Removable />)
  await userEvent.click(screen.getByRole('button', { name: 'Open keys' }))
  act(() => screen.getByRole('button', { name: 'Remove opener', hidden: true }).click())
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus())
})

it('falls back to the page heading when the opener was document.body', async () => {
  function FromBody() {
    const [open, setOpen] = useState(false)
    return (
      <Page title="Kit">
        <Button onClick={() => { (document.activeElement as HTMLElement).blur(); setOpen(true) }}>Open keys</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Keyboard"><p>Body</p></Dialog>
      </Page>
    )
  }
  render(<FromBody />)
  await userEvent.click(screen.getByRole('button', { name: 'Open keys' }))
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus())
})

it('dims the page with the scrim token, which darkens in both themes', () => {
  render(<Dialog open onOpenChange={() => {}} title="Scrim"><p>Body</p></Dialog>)
  const overlay = document.querySelector('[data-part="scrim"]')
  expect(overlay?.getAttribute('class')).toContain('bg-scrim/')
})

it('has a visible Close button that closes and returns focus to the opener', async () => {
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Open keys' })
  await userEvent.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Keyboard' })
  await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await waitFor(() => expect(trigger).toHaveFocus())
})

it('leaves focus where the page put it when the dialog was torn down with its panel', async () => {
  function Panel() {
    const [panelShown, setPanelShown] = useState(true)
    const [open, setOpen] = useState(false)
    return (
      <Page title="Kit">
        {panelShown ? (
          <>
            <Button onClick={() => setOpen(true)}>Open keys</Button>
            <Dialog open={open} onOpenChange={setOpen} title="Keyboard">
              <Button onClick={() => setPanelShown(false)}>Finish</Button>
            </Dialog>
          </>
        ) : null}
        <p id="slip" tabIndex={-1}>The new record</p>
      </Page>
    )
  }
  render(<Panel />)
  await userEvent.click(screen.getByRole('button', { name: 'Open keys' }))
  act(() => within(screen.getByRole('dialog', { name: 'Keyboard' })).getByRole('button', { name: 'Finish' }).click())
  const slip = screen.getByText('The new record')
  // The page hands focus to the new record before Radix's 0ms close timer runs.
  slip.focus()
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
  expect(slip).toHaveFocus()
})

it('never grows past the viewport: its content scrolls', () => {
  render(<Dialog open onOpenChange={() => {}} title="Long"><p>Body</p></Dialog>)
  const dialog = screen.getByRole('dialog', { name: 'Long' })
  expect(dialog.className).toContain('supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]')
  expect(dialog.className).toContain('max-h-[calc(100vh-2rem)]')
  expect(dialog.className).toContain('overflow-y-auto')
})

it('never breaks an id in its title at the hyphen', () => {
  render(<Dialog open onOpenChange={() => {}} title="Resolve brk-002?"><p>x</p></Dialog>)
  const title = screen.getByRole('heading', { name: 'Resolve brk-002?' })
  expect(title.querySelector('span.whitespace-nowrap')).toHaveTextContent(/^brk-002$/)
})
