import { describe, it, expect } from 'vitest'
import {
  findPaletteViolations, findColorLiterals, findFormatterBypass, findRawElements, findRawTokenVars, colorLiteralsOutsideTokens, findBreakpointLiterals, findMocksImports,
} from './detectors'

describe('palette detector', () => {
  it.each([
    'className="bg-blue-500"', 'className="text-red-600/50"', 'className="border-slate-200"',
    'className="text-white"', 'className="bg-[#ff0000]"', 'className="text-[oklch(0.5_0.1_20)]"',
    'className="fill-[rgb(0,0,0)]"', 'className="bg-[color:var(--x)]"',
    'className="text-[var(--ws-ink)]"', 'className="bg-[var(--x)]"', 'className="bg-[color-mix(in_oklab,red,blue)]"',
    'className="bg-[light-dark(a,b)]"', 'className="bg-(--ws-ink)"', 'className="bg-(color:--x)"',
    'className="checked:inset-ring-white"', 'className="inset-ring-[#fff]"', 'className="inset-ring-(--ws-face)"',
    '<rect fill="red" />', '<path stroke="black" />', "style={{ color: 'red' }}", "{ backgroundColor: 'white' }",
  ])('catches %s', (src) => expect(findPaletteViolations(src)).not.toEqual([]))
  it.each([
    'className="bg-ink text-face"', 'className="text-signal-ink border-rule-2"', 'className="text-label"',
    'className="w-[64px] text-table"', 'className="bg-transparent"', 'className="checked:inset-ring-3 checked:inset-ring-face"',
    'className="w-[min(560px,calc(100vw-32px))] h-[34px]"', 'className="grid-cols-[2rem_1fr_auto]"',
    '<rect fill="none" />', '<path stroke="currentColor" />', 'fill={`url(#id)`}', 'className="fill-ink"',
  ])('allows %s', (src) => expect(findPaletteViolations(src)).toEqual([]))
})

describe('color literal detector', () => {
  it.each(['const c = "#ff0000"', "style={{ color: 'rgb(0,0,0)' }}", 'fill="oklch(0.5 0.1 20)"', 'hsl(10 20% 30%)'])(
    'catches %s', (src) => expect(findColorLiterals(src)).not.toEqual([]))
  it.each(['href="#main"', 'id="page-title"', 'const n = 0xff'])('allows %s', (src) => expect(findColorLiterals(src)).toEqual([]))
  it('CSS color values are allowed only inside the token markers', () => {
    expect(colorLiteralsOutsideTokens('/* tokens:start */ :root { --a: oklch(0.5 0 0); } /* tokens:end */')).toEqual([])
    expect(colorLiteralsOutsideTokens('/* tokens:start */ /* tokens:end */ .x { color: #fff; }')).not.toEqual([])
    expect(colorLiteralsOutsideTokens('.x { color: red; }')).not.toEqual([])
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
  it.each(['<button onClick={x}>', '<table>', '<dialog open>', '<input value={q} />', '<select>', '<textarea rows={3}>'])('catches %s', (src) => expect(findRawElements(src)).not.toEqual([]))
  it.each(['<Button rank="primary">', '<DataTable', '<Dialog', '<Attestation', '<inputs', '<Select'])('allows %s', (src) => expect(findRawElements(src)).toEqual([]))
})

describe('raw token variable detector', () => {
  it.each(['color: var(--ws-ink)', 'x = "var( --ws-rule)"'])('catches %s', (src) => expect(findRawTokenVars(src)).not.toEqual([]))
  it.each(['className="text-ink"', 'var(--x)', 'const ws = 1'])('allows %s', (src) => expect(findRawTokenVars(src)).toEqual([]))
})

describe('breakpoint literal detector', () => {
  it.each(['className="min-[1100px]:col-span-8"', 'className="max-[1100px]:hidden"', 'className="max-w-[1440px]"'])(
    'catches %s', (src) => expect(findBreakpointLiterals(src)).not.toEqual([]))
  it.each(['className="split:col-span-8"', 'className="max-w-(--breakpoint-wide)"', 'className="max-w-[65ch] w-[64px]"', 'className="max-[700px]:grid-cols-1"'])(
    'allows %s', (src) => expect(findBreakpointLiterals(src)).toEqual([]))
})

describe('findMocksImports', () => {
  const none = { allowDynamic: [] }
  it('finds a value import, a side-effect import, a re-export and a dynamic import', () => {
    expect(findMocksImports("import { accounts } from '@/mocks/data/accounts'", none)).toEqual(['value import: @/mocks/data/accounts'])
    expect(findMocksImports("import '@/mocks/browser'", none)).toEqual(['side-effect import: @/mocks/browser'])
    expect(findMocksImports("export { handlers } from '../../mocks/handlers'", none)).toEqual(['re-export: ../../mocks/handlers'])
    expect(findMocksImports("const m = await import('@/mocks/browser')", none)).toEqual(['dynamic import: @/mocks/browser'])
    expect(findMocksImports("import { x } from '@/mocks'", none)).toEqual(['value import: @/mocks'])
  })
  it('finds a path relative to the entry: ./mocks, as main.tsx would write it', () => {
    expect(findMocksImports("import { worker } from './mocks/browser'", none)).toEqual(['value import: ./mocks/browser'])
    expect(findMocksImports("const m = await import('./mocks/browser')", none)).toEqual(['dynamic import: ./mocks/browser'])
    expect(findMocksImports("import { a } from './../mocks/data/accounts'", none)).toEqual(['value import: ./../mocks/data/accounts'])
    expect(findMocksImports("import { a } from './mockups/x'", none)).toEqual([])
  })
  it('allows type-only imports and the dynamic imports it is told to', () => {
    expect(findMocksImports("import type { Account } from '@/mocks/data/accounts'\nexport type { X } from '@/mocks/x'", none)).toEqual([])
    expect(findMocksImports("await import('@/mocks/browser')", { allowDynamic: ['@/mocks/browser'] })).toEqual([])
  })
})
