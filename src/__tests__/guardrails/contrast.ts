import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Oklch = { l: number; c: number; h: number }
export type Palette = Map<string, Oklch>

const CSS_PATH = join(process.cwd(), 'src/styles/app.css')

export function readAppCss(): string {
  return readFileSync(CSS_PATH, 'utf8')
}

function block(css: string, selector: string): string {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`app.css has no block for ${selector}`)
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i) }
  }
  throw new Error(`unterminated block for ${selector}`)
}

function parsePalette(body: string): Palette {
  const palette: Palette = new Map()
  for (const m of body.matchAll(/--ws-([a-z0-9-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g)) {
    palette.set(m[1]!, { l: Number(m[2]), c: Number(m[3]), h: Number(m[4]) })
  }
  for (const m of body.matchAll(/--ws-([a-z0-9-]+):\s*var\(--ws-([a-z0-9-]+)\)/g)) {
    const target = palette.get(m[2]!)
    if (!target) throw new Error(`--ws-${m[1]} aliases --ws-${m[2]}, which this block does not define`)
    palette.set(m[1]!, target)
  }
  return palette
}

export function lightPalette(css: string): Palette {
  return parsePalette(block(css, ':root {'))
}

export function darkPalette(css: string): Palette {
  return parsePalette(block(css, ':root[data-theme="dark"]'))
}

export function mediaDarkPalette(css: string): Palette {
  return parsePalette(block(css, ':root:not([data-theme="light"])'))
}

function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return [
    clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ]
}

export function luminance(color: Oklch): number {
  const [r, g, b] = toLinearSrgb(color)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
