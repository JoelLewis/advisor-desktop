import { describe, it, expect } from 'vitest'
import {
  findPaletteViolations, findColourLiterals, findFormatterBypass, findRawElements, findRawTokenVars, colourLiteralsOutsideTokens,
} from './detectors'

describe('palette detector', () => {
  it.each([
    'className="bg-blue-500"', 'className="text-red-600/50"', 'className="border-slate-200"',
    'className="text-white"', 'className="bg-[#ff0000]"', 'className="text-[oklch(0.5_0.1_20)]"',
    'className="fill-[rgb(0,0,0)]"', 'className="bg-[color:var(--x)]"',
    'className="text-[var(--ws-ink)]"', 'className="bg-[var(--x)]"', 'className="bg-[color-mix(in_oklab,red,blue)]"',
    'className="bg-[light-dark(a,b)]"', 'className="bg-(--ws-ink)"', 'className="bg-(color:--x)"',
    '<rect fill="red" />', '<path stroke="black" />', "style={{ color: 'red' }}", "{ backgroundColor: 'white' }",
  ])('catches %s', (src) => expect(findPaletteViolations(src)).not.toEqual([]))
  it.each([
    'className="bg-ink text-face"', 'className="text-signal-ink border-rule-2"', 'className="text-label"',
    'className="w-[64px] text-table"', 'className="bg-transparent"',
    'className="w-[min(560px,calc(100vw-32px))] h-[34px]"', 'className="grid-cols-[2rem_1fr_auto]"',
    '<rect fill="none" />', '<path stroke="currentColor" />', 'fill={`url(#id)`}', 'className="fill-ink"',
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
  it.each(['v.toFixed(2)', 'n.toLocaleString()', 'new Intl.NumberFormat("en-US")', 'Intl.DateTimeFormat()',
    'd.toLocaleDateString()', 'd.toLocaleTimeString("en")', 'n.toLocaleFooString()', 'n.toPrecision(3)', 'n.toExponential(1)',
    'new Intl . RelativeTimeFormat()', 'Intl.PluralRules', 'v?.toFixed (2)', 'v .\n toFixed(2)'])(
    'catches %s', (src) => expect(findFormatterBypass(src)).not.toEqual([]))
  it('allows measure calls', () => {
    for (const src of ['fmtMoney(v)', 'measure.fmtDate(x)', 'formatToFixedWidth(v)']) expect(findFormatterBypass(src)).toEqual([])
  })
})

describe('raw element detector', () => {
  it.each(['<button onClick={x}>', '<table>', '<dialog open>'])('catches %s', (src) => expect(findRawElements(src)).not.toEqual([]))
  it.each(['<Button rank="primary">', '<DataTable', '<Dialog'])('allows %s', (src) => expect(findRawElements(src)).toEqual([]))
})

describe('raw token variable detector', () => {
  it.each(['color: var(--ws-ink)', 'x = "var( --ws-rule)"'])('catches %s', (src) => expect(findRawTokenVars(src)).not.toEqual([]))
  it.each(['className="text-ink"', 'var(--x)', 'const ws = 1'])('allows %s', (src) => expect(findRawTokenVars(src)).toEqual([]))
})
