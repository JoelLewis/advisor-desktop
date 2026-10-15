import { describe, it, expect } from 'vitest'
import { defaultPhonePane, phonePanes } from '@/workspace/shell/phone-panes'

describe('the phone panes', () => {
  it('offers the thread list, the page and the context column that the route has', () => {
    expect(phonePanes({ listHidden: false, hasContext: true })).toEqual(['threads', 'thread', 'context'])
    expect(phonePanes({ listHidden: false, hasContext: false })).toEqual(['threads', 'thread'])
    expect(phonePanes({ listHidden: true, hasContext: true })).toEqual(['thread', 'context'])
    expect(phonePanes({ listHidden: true, hasContext: false })).toEqual(['thread'])
  })
  it('opens on the thread for a thread route, on the list at home, on the page elsewhere', () => {
    expect(defaultPhonePane('/t/th-brief', false)).toBe('thread')
    expect(defaultPhonePane('/', false)).toBe('threads')
    expect(defaultPhonePane('/billing', true)).toBe('thread')
    expect(defaultPhonePane('/archive', false)).toBe('thread')
  })
})
