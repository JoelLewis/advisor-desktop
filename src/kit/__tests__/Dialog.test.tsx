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
