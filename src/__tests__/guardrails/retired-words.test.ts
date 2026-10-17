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

describe('what each pattern reads', () => {
  const entry = (word: string) => RETIRED_WORDS.find((w) => w.word === word)!.pattern
  it.each([
    ['binding', 'Binding acts', true],
    ['Take to', 'Take … to a team thread', true],
    ['Take to', 'Shared to the desk', false],
    ['MAY NOT', 'MAY NOT edit', true],
    ['MAY NOT', 'Reviewed in May 2026; you may proceed', false],
    ['PRIVATE', 'PRIVATE', true],
    ['PRIVATE', 'Private equity', false],
    ['INTERNAL', 'Internal rate of return', false],
    ["Firm only · client can't see", 'Firm only · client can\u2019t see', true],
    ["Firm only · client can't see", "Robert can't see this", false],
    ['CLIENT CAN SEE', 'CLIENT CAN SEE', true],
    ['CLIENT CAN SEE', 'no client can see this', false],
    ['staged orders', 'The staged orders are withdrawn.', true],
    ['staged orders', 'Released the orders approved in v1', false],
    ['moved book', "The orders fill at the day's prices. The book moves.", true],
  ])('%s: "%s" -> %s', (word, text, hit) => expect(entry(word).test(text)).toBe(hit))
})
