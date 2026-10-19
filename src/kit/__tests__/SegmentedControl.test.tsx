import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from '@/kit/segmented/SegmentedControl'

const OPTIONS = [{ value: 'households', label: 'Households' }, { value: 'conversations', label: 'Conversations' }] as const

describe('SegmentedControl', () => {
  it('is a named group of buttons, the shown one pressed', () => {
    render(<SegmentedControl label="Show" options={OPTIONS} value="households" onChange={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'Show' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Households' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Conversations' })).toHaveAttribute('aria-pressed', 'false')
  })
  it('is chosen with the keyboard: Tab reaches each, Enter and Space choose', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<SegmentedControl label="Show" options={OPTIONS} value="households" onChange={onChange} />)
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Conversations' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onChange.mock.calls).toEqual([['conversations'], ['conversations']])
  })
})
