import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { listSourceFiles } from './detectors'

/**
 * A word the spec retires from what people read. `retired` is false while the word is still in the source and
 * true once the task that removes it has switched it on; both states are tested, so a removal without the switch
 * fails, and so does a switch without the removal.
 *
 * `pattern` is tried on each user-facing string of the code; `prose` (default: `pattern`) on each line of the text
 * files (`index.html`, `README.md`), where a string is not a unit. `skip` names a legitimate use: one file and one
 * string, never a whole directory.
 */
export type RetiredWord = {
  word: string
  pattern: RegExp
  prose?: RegExp
  retired: boolean
  skip?: (file: string, text: string) => boolean
}

const APOS = "['\u2019]"

export const RETIRED_WORDS: readonly RetiredWord[] = [
  {
    // A whole label only: "Private equity" and "Private" in a fund's name are finance, not a visibility word.
    word: 'PRIVATE',
    pattern: /^(?:Private|PRIVATE)$/,
    prose: /\bprivate\b(?!\s+(?:equity|company|credit|markets?|stock|fund))/i,
    retired: false, // README.md still says "private"; Task 14 rewrites it.
  },
  {
    // A whole label only: "internal rate of return" is finance. A sleeve's manager is "Internal" in the book's
    // data: a name, not a visibility word.
    word: 'INTERNAL',
    pattern: /^(?:Internal|INTERNAL)$/,
    retired: true,
    skip: (file, text) => file === 'src/mocks/data/accounts.ts' && text === 'Internal',
  },
  // The old labels were upper case. The new copy says "no client can see this" and "All clients and prospects"
  // in prose, so these three match the upper-case label only.
  { word: 'CLIENTS AND PROSPECTS', pattern: /\bCLIENTS AND PROSPECTS\b/, retired: true },
  { word: 'CLIENT CAN SEE', pattern: /\bCLIENT CAN SEE\b/, retired: true },
  { word: 'PROSPECT CAN SEE', pattern: /\bPROSPECT CAN SEE\b/, retired: true },
  {
    word: "Firm only · client can't see",
    pattern: new RegExp(`\\bfirm only\\b|\\b(?:client|prospect) can${APOS}t see\\b`, 'i'),
    retired: false, // ProspectApproval.tsx still says "firm only".
  },
  { word: 'Only you', pattern: /\bonly you\b/i, retired: true },
  { word: 'binding', pattern: /\bbinding\b/i, retired: false },
  // "Taken to" is plain English. A JSX hole ("Take {x} to") reads as two texts and is a known limit.
  { word: 'Take to', pattern: /\bTake(?: …)? to\b/, retired: false },
  { word: 'carried', pattern: /\b[Cc]arried (?:by|from)\b/, retired: false },
  { word: 'Thread context', pattern: /\bThread context\b/, retired: false },
  { word: 'Full views', pattern: /\b[Ff]ull views?\b/, retired: false },
  // The role words: upper case anywhere in a string, or a lower-case label on its own (AgentScope sets the verb in
  // capitals by CSS). Never "May 2026" or "may" inside a sentence.
  { word: 'MAY NOT', pattern: /\bMAY(?: NOT)?\b|^(?:may|may not)$/, retired: false },
]

const TEXT_FILES = ['index.html', 'README.md'] as const

const isErrorConstruction = (node: ts.Node): boolean =>
  ts.isNewExpression(node) && /Error$/.test(node.expression.getText())

function insideErrorOrModuleOrType(node: ts.Node): boolean {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (isErrorConstruction(n) || ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n)) return true
  }
  return false
}

/** Every string a person can read in this source: literals, templates (holes read as "…") and JSX text. */
export function userFacingStrings(source: string, fileName: string): { text: string; line: number }[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const found: { text: string; line: number }[] = []
  const add = (node: ts.Node, text: string) => {
    const trimmed = text.replace(/\s+/g, ' ').trim()
    if (trimmed && !insideErrorOrModuleOrType(node)) found.push({ text: trimmed, line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1 })
  }
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text)
    else if (ts.isTemplateExpression(node)) {
      add(node, [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join('…'))
      return
    } else if (ts.isJsxText(node)) add(node, node.text)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

const SOURCE_FILES = listSourceFiles('src').filter((f) => !f.startsWith('src/test/') && !f.startsWith('src/__tests__/'))

/** Where a retired word still reads, as "file:line: text". */
export function retiredWordHits(entry: RetiredWord): string[] {
  const inCode = SOURCE_FILES.flatMap((f) =>
    userFacingStrings(readFileSync(join(process.cwd(), f), 'utf8'), f)
      .filter((s) => entry.pattern.test(s.text) && !entry.skip?.(f, s.text))
      .map((s) => `${f}:${s.line}: ${s.text}`))
  const prose = entry.prose ?? entry.pattern
  const inText = TEXT_FILES.flatMap((f) =>
    readFileSync(join(process.cwd(), f), 'utf8')
      .split('\n')
      .flatMap((line, i) => (prose.test(line) && !entry.skip?.(f, line) ? [`${f}:${i + 1}: ${line.trim()}`] : [])))
  return [...inCode, ...inText]
}
