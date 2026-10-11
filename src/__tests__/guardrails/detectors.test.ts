import { describe, it, expect } from 'vitest'
import {
  findPaletteViolations, findColourLiterals, findFormatterBypass, findRawElements, colourLiteralsOutsideTokens,
} from './detectors'

describe('palette detector', () => {
  it.each([
    'className="bg-blue-500"', 'className="text-red-600/50"', 'className="border-slate-200"',
    'className="text-white"', 'className="bg-[#ff0000]"', 'className="text-[oklch(0.5_0.1_20)]"',
    'className="fill-[rgb(0,0,0)]"', 'className="bg-[color:var(--x)]"',
  ])('catches %s', (src) => expect(findPaletteViolations(src)).not.toEqual([]))
  it.each([
    'className="bg-ink text-face"', 'className="text-signal-ink border-rule-2"', 'className="text-label"',
    'className="w-[64px] text-table"', 'className="bg-transparent"',
  ])('allows %s', (src) => expect(findPaletteViolations(src)).toEqual([]))
})

describe('colour literal detector', () => {
  it.each(['const c = "#ff0000"', "style={{ color: 'rgb(0,0,0)' }}", 'fill="oklch(0.5 0.1 20)"', 'hsl(10 20% 30%)'])(
    'catches %s', (src) => expect(findColourLiterals(src)).not.toEqual([]))
  it.each(['href="#main"', 'id="page-title"', 'const n = 0xff'])('allows %s', (src) => expect(findColourLiterals(src)).toEqual([]))
  it('CSS colour values are allowed only inside the token markers', () => {
    expect(colourLiteralsOutsideTokens('/* tokens:start */ :root { --a: oklch(0.5 0 0); } /* tokens:end */')).toEqual([])
    expect(colourLiteralsOutsideTokens('/* tokens:start */ /* tokens:end */ .x { color: #fff; }')).not.toEqual([])
    expect(colourLiteralsOutsideTokens('.x { color: red; }')).not.toEqual([])
  })
})

describe('formatter detector', () => {
  it.each(['v.toFixed(2)', 'n.toLocaleString()', 'new Intl.NumberFormat("en-US")', 'Intl.DateTimeFormat()'])(
    'catches %s', (src) => expect(findFormatterBypass(src)).not.toEqual([]))
  it('allows measure calls', () => expect(findFormatterBypass('fmtMoney(v)')).toEqual([]))
})

describe('raw element detector', () => {
  it.each(['<button onClick={x}>', '<table>', '<dialog open>'])('catches %s', (src) => expect(findRawElements(src)).not.toEqual([]))
  it.each(['<Button rank="primary">', '<DataTable', '<Dialog'])('allows %s', (src) => expect(findRawElements(src)).toEqual([]))
})
