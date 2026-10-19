import { it, expect } from 'vitest'
import type { UIMatch } from 'react-router-dom'
import { threadListHidden } from '@/workspace/shell/context-column'

const match = (handle: unknown): UIMatch => ({ id: 'x', pathname: '/', params: {}, data: undefined, handle })

it('a route hides the thread list only when its handle says so', () => {
  expect(threadListHidden([match(undefined), match({ threadList: 'hidden' })])).toBe(true)
  expect(threadListHidden([match(undefined), match({ contextColumn: undefined })])).toBe(false)
  expect(threadListHidden([])).toBe(false)
})
