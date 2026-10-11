import { it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextInput } from '@/kit/text-input/TextInput'

function Controlled({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('')
  return <TextInput label="Message" value={value} placeholder="Write to the team" onChange={(v) => { setValue(v); onChange?.(v) }} />
}

it('is a textarea named by its visible label, with its placeholder', () => {
  render(<TextInput label="Message" value="" placeholder="Write to the team" onChange={() => {}} />)
  const box = screen.getByRole('textbox', { name: 'Message' })
  expect(box.tagName).toBe('TEXTAREA')
  expect(screen.getByText('Message').tagName).toBe('LABEL')
  expect(box).toHaveAttribute('placeholder', 'Write to the team')
})

it('reports each edit as the whole value', async () => {
  const onChange = vi.fn()
  render(<Controlled onChange={onChange} />)
  await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Hi')
  expect(onChange).toHaveBeenLastCalledWith('Hi')
  expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Hi')
})

it('can be disabled and described', () => {
  render(<>
    <TextInput label="Message" value="" onChange={() => {}} disabled describedBy="hint" />
    <p id="hint">Firm only</p>
  </>)
  const box = screen.getByRole('textbox', { name: 'Message' })
  expect(box).toBeDisabled()
  expect(box).toHaveAccessibleDescription('Firm only')
})
