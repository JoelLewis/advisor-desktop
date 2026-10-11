import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const UI_ROOTS = ['src/kit', 'src/app'] as const

export function listSourceFiles(root: string): string[] {
  const abs = join(process.cwd(), root)
  return readdirSync(abs).flatMap((name) => {
    const path = join(abs, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : listSourceFiles(join(root, name))
    return /\.(ts|tsx)$/.test(name) ? [join(root, name)] : []
  })
}

const PALETTE = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white'
const COLOUR_PREFIX = 'bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|outline|decoration|divide|from|via|to|accent|caret|shadow|placeholder'
const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:${COLOUR_PREFIX})-(?:${PALETTE})(?:-\\d{2,3})?(?:\\/\\d+)?(?![\\w-])`, 'g')
const ARBITRARY_COLOUR = /-\[(?:#|rgba?\(|hsla?\(|oklch\(|oklab\(|color:)/g

export function findPaletteViolations(src: string): string[] {
  return [...src.matchAll(PALETTE_CLASS), ...src.matchAll(ARBITRARY_COLOUR)].map((m) => m[0])
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

const FORMATTERS = /\.toFixed\(|\.toLocaleString\(|\bIntl\.(?:NumberFormat|DateTimeFormat)\b/g

export function findFormatterBypass(src: string): string[] {
  return [...src.matchAll(FORMATTERS)].map((m) => m[0])
}

const RAW = /<(?:button|table|dialog)\b/g

export function findRawElements(src: string): string[] {
  return [...src.matchAll(RAW)].map((m) => m[0])
}
