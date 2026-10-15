import { describe, it, expect } from 'vitest'
import { RETIRED_WORDS, retiredWordHits, userFacingStrings } from './retired-words'

describe('userFacingStrings', () => {
  const source = [
    "import { x } from './binding'",
    "type Kind = 'binding'",
    '// a binding comment',
    "const a = 'Take to'",
    'const b = `Take ${name} to a team thread`',
    "const c = <p>Binding acts</p>",
    "if (!ok) throw new Error('the binding act is missing')",
    "const d = new MeasureError('binding')",
  ].join('\n')
  const texts = userFacingStrings(source, 'fixture.tsx').map((s) => s.text)

  it('reads string literals, templates with their holes, and JSX text', () => {
    expect(texts).toEqual(['Take to', 'Take … to a team thread', 'Binding acts'])
  })
  it('names the line each string is on', () => {
    expect(userFacingStrings(source, 'fixture.tsx').find((s) => s.text === 'Binding acts')?.line).toBe(6)
  })
})

describe('retired words', () => {
  it.each(RETIRED_WORDS.filter((w) => w.retired).map((w) => [w.word, w] as const))('"%s" appears in no user-facing string', (_, entry) => {
    expect(retiredWordHits(entry)).toEqual([])
  })
  it.each(RETIRED_WORDS.filter((w) => !w.retired).map((w) => [w.word, w] as const))(
    '"%s" is still in use; the task that removes it switches it on',
    (_, entry) => expect(retiredWordHits(entry).length).toBeGreaterThan(0),
  )
})
