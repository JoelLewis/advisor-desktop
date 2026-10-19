import { describe, it, expect } from 'vitest'
import { brandOf } from '@/workspace/shell/brand-words'
import type { Person } from '@/types/workspace'

const people: Person[] = [
  { id: 'user-001', name: 'Adrian Hale', role: 'advisor' }, { id: 'cco-001', name: 'Mark Davis', role: 'compliance' },
  { id: 'cli-001', name: 'Robert Johnson', role: 'client' }, { id: 'prsp-011', name: 'Dr. Amanda Pell', role: 'prospect' },
]

describe('brandOf', () => {
  it('names the product to the firm', () => {
    expect(brandOf('user-001', undefined)).toEqual({ name: 'Advisor Desktop' })
    expect(brandOf('cco-001', people)).toEqual({ name: 'Advisor Desktop' })
  })
  it('names the firm and the person to a client or a prospect', () => {
    expect(brandOf('cli-001', people)).toEqual({ name: 'Larkfield Advisory', viewerName: 'Robert Johnson' })
    expect(brandOf('prsp-011', people)).toEqual({ name: 'Larkfield Advisory', viewerName: 'Dr. Amanda Pell' })
  })
  it('shows someone it does not know the firm, and no name', () => {
    expect(brandOf('cli-999', people)).toEqual({ name: 'Larkfield Advisory' })
    expect(brandOf('cli-001', undefined)).toEqual({ name: 'Larkfield Advisory' })
  })
})
