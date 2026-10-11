import { describe, it, expect } from 'vitest'
import { contrast, darkPalette, lightPalette, mediaDarkPalette, readAppCss, type Palette } from './contrast'

const SURFACES = ['bg', 'face', 'band'] as const
const TEXT = ['ink', 'ink-2', 'ink-3', 'signal-ink'] as const
const MARKS = ['signal', 'rule-2', 'ink'] as const // signal marks, meaningful rules, focus ring

function check(name: string, palette: Palette) {
  describe(`${name} theme`, () => {
    for (const s of SURFACES) {
      for (const t of TEXT) {
        it(`${t} on ${s} is at least 4.5:1`, () => {
          expect(contrast(palette.get(t)!, palette.get(s)!)).toBeGreaterThanOrEqual(4.5)
        })
      }
      for (const m of MARKS) {
        it(`${m} on ${s} is at least 3:1`, () => {
          expect(contrast(palette.get(m)!, palette.get(s)!)).toBeGreaterThanOrEqual(3)
        })
      }
    }
  })
}

const css = readAppCss()
check('light', lightPalette(css))
check('dark', darkPalette(css))

describe('token blocks', () => {
  it('every token is defined in light and dark', () => {
    const keys = [...lightPalette(css).keys()].sort()
    expect(keys).toEqual([...darkPalette(css).keys()].sort())
    expect(keys).toEqual(expect.arrayContaining([...SURFACES, ...TEXT, 'signal', 'rule', 'rule-2', 'band']))
  })
  it('the prefers-color-scheme dark block matches the explicit dark block', () => {
    expect(Object.fromEntries(mediaDarkPalette(css))).toEqual(Object.fromEntries(darkPalette(css)))
  })
  it('contrast maths: ink on face in light is high, rule on face is low', () => {
    const p = lightPalette(css)
    expect(contrast(p.get('ink')!, p.get('face')!)).toBeGreaterThan(12)
    expect(contrast(p.get('rule')!, p.get('face')!)).toBeLessThan(2)
  })
})
