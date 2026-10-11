import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Everything under src is UI and scanned, except these engine and test roots. */
export const ENGINE_ROOTS: readonly string[] = ['src/mocks', 'src/lib', 'src/services', 'src/types', 'src/hooks', 'src/test', 'src/__tests__']

export function uiRoots(): string[] {
  return readdirSync(join(process.cwd(), 'src')).map((name) => `src/${name}`).filter((root) => !ENGINE_ROOTS.includes(root))
}

const isSource = (name: string) => /\.(ts|tsx)$/.test(name)

export function listSourceFiles(root: string): string[] {
  const abs = join(process.cwd(), root)
  if (!statSync(abs).isDirectory()) return isSource(root) ? [root] : []
  return readdirSync(abs).flatMap((name) => {
    const path = join(abs, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : listSourceFiles(join(root, name))
    return isSource(name) ? [join(root, name)] : []
  })
}

const PALETTE = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white'
const COLOUR_PREFIX = 'bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|outline|decoration|divide|from|via|to|accent|caret|shadow|placeholder'
const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:${COLOUR_PREFIX})-(?:${PALETTE})(?:-\\d{2,3})?(?:\\/\\d+)?(?![\\w-])`, 'g')
const ARBITRARY_COLOUR = /-\[(?:#|rgba?\(|hsla?\(|oklch\(|oklab\(|color:)/g
const COLOUR_FROM_VARIABLE = new RegExp(
  `(?<![\\w-])(?:${COLOUR_PREFIX})-(?:\\[(?:var|color-mix|light-dark)\\(|\\((?:color:)?--)`, 'g')

const COLOUR_NAMES = `${PALETTE}|grey|silver|maroon|navy|olive|aqua|fuchsia`
const NAMED_COLOUR_VALUE = new RegExp(
  `(?<![\\w-])(?:fill|stroke|background|\\w*[cC]olor)\\s*[=:]\\s*\\{?\\s*["'\`](?:${COLOUR_NAMES})["'\`]`, 'g')

export function findPaletteViolations(src: string): string[] {
  return [
    ...src.matchAll(PALETTE_CLASS), ...src.matchAll(ARBITRARY_COLOUR),
    ...src.matchAll(COLOUR_FROM_VARIABLE), ...src.matchAll(NAMED_COLOUR_VALUE),
  ].map((m) => m[0])
}

export function findRawTokenVars(src: string): string[] {
  return [...src.matchAll(/var\(\s*--ws-/g)].map((m) => m[0])
}

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g
const COLOUR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/g

export function findColourLiterals(src: string): string[] {
  return [...src.matchAll(HEX), ...src.matchAll(COLOUR_FN)].map((m) => m[0])
}

const NAMED_CSS = new RegExp(`:\\s*(?:${PALETTE}|grey|silver|maroon|navy|olive|aqua|fuchsia)\\b`, 'g')

export function colourLiteralsOutsideTokens(css: string): string[] {
  const outside = css.replace(/\/\* tokens:start[\s\S]*?\/\* tokens:end \*\//g, '')
  return [...findColourLiterals(outside), ...[...outside.matchAll(NAMED_CSS)].map((m) => m[0])]
}

const FORMATTERS = /\.\s*(?:toFixed|toPrecision|toExponential|toLocale\w*String)\s*\(|\bIntl\s*\.\s*\w+/g

export function findFormatterBypass(src: string): string[] {
  return [...src.matchAll(FORMATTERS)].map((m) => m[0])
}

const RAW = /<(?:button|table|dialog|input|select|textarea)\b/g

export function findRawElements(src: string): string[] {
  return [...src.matchAll(RAW)].map((m) => m[0])
}

const BREAKPOINT_LITERAL = /(?:min|max)(?:-w)?-\[(?:768|1100|1440)px\]/g

/** The layout breakpoints are @theme tokens (`split:`, `max-w-(--breakpoint-wide)`), never literal widths. A component's own local breakpoint is its business. */
export function findBreakpointLiterals(src: string): string[] {
  return [...src.matchAll(BREAKPOINT_LITERAL)].map((m) => m[0])
}
