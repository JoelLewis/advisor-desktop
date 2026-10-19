import { describe, it, expect } from 'vitest'
import { sendLabelOf } from '@/workspace/context/send-label'

describe('sendLabelOf', () => {
  it('names the party, then each copy, as a button addresses them', () => {
    expect(sendLabelOf('Robert Johnson', {})).toBe('Send to Robert')
    expect(sendLabelOf('Robert Johnson', { copies: [{ threadId: 'th-patricia', partyName: 'Patricia Johnson' }] })).toBe('Send to Robert and Patricia')
    expect(sendLabelOf('Dr. Amanda Pell', {})).toBe('Send to Dr. Pell')
  })
})
