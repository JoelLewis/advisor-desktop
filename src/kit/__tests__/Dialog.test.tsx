import { it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/kit/dialog/Dialog'
import { Button } from '@/kit/button/Button'

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
