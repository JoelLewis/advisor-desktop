import { describe, it, expect } from 'vitest'
import { TABULAR_NUMS } from '../utils'

describe('tabular figures', () => {
  it('exports the class pair every numeric surface uses', () => {
    expect(TABULAR_NUMS).toBe('font-mono tabular-figures')
  })
})
