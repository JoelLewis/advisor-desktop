import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8')
const sizes = [...css.matchAll(/--text-([a-z-]+):\s*([^;]+);/g)].filter(([, name]) => !name!.includes('--'))

describe('the type scale follows the reader\'s font size', () => {
  it('states every size in rem', () => {
    expect(sizes.length).toBeGreaterThanOrEqual(10)
    for (const [, name, value] of sizes) expect(value, name).toMatch(/^(?:[\d.]+rem|clamp\([\d.]+rem, [\d.]+vw, [\d.]+rem\))$/)
  })
  it('keeps today\'s px at the default root size', () => {
    const px = Object.fromEntries(sizes.map(([, name, value]) => [name, Number(/^([\d.]+)rem$/.exec(value!)?.[1]) * 16]))
    expect(px).toMatchObject({ label: 10.5, 'table-dense': 12.5, table: 13, body: 14, copy: 15.5, title: 22, total: 28, 'readout-sm': 36 })
  })
  it('sets the body in rem and form controls at 16 px or more on narrow screens, outside any layer so utilities cannot outrank it', () => {
    expect(css).toMatch(/body \{[^}]*font-size: 0\.875rem;/)
    expect(css).toMatch(/input, select, textarea \{\s*@variant max-narrow \{\s*font-size: max\(16px, 1rem\);/)
    expect(css.indexOf('input, select, textarea')).toBeGreaterThan(css.indexOf('@layer base'))
    expect(/@layer base \{[\s\S]*?\n\}\n/.exec(css)![0]).not.toContain('input, select, textarea')
  })
})
