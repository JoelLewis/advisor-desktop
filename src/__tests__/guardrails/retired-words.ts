import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { listSourceFiles } from './detectors'

/**
 * A word the spec retires from what people read. `retired` is false while the word is still in the source and
 * true once the task that removes it has switched it on; both states are tested, so a removal without the switch
 * fails, and so does a switch without the removal.
 */
export type RetiredWord = { word: string; pattern: RegExp; retired: boolean; skip?: (file: string) => boolean }

export const RETIRED_WORDS: readonly RetiredWord[] = [
  {
    word: 'the old visibility words',
    pattern: /\bOnly you\b|\bFirm only\b|CAN SEE|\b(?:client|prospect) can't see\b|\bClients and prospects\b|CLIENTS AND PROSPECTS|^(?:Private|Internal)$|\bShared with (?:you|the client)\b/,
    retired: false,
    // A sleeve's manager is "Internal" in the book's data: a name, not a visibility word.
    skip: (file) => file.startsWith('src/mocks/data/'),
  },
  { word: 'binding', pattern: /\bbinding\b/i, retired: false },
  { word: 'Take to', pattern: /\bTaken?\b(?: …)? to\b/, retired: false },
  { word: 'carried', pattern: /\b[Cc]arried (?:by|from)\b/, retired: false },
  { word: 'Thread context', pattern: /\bThread context\b/, retired: false },
  { word: 'Full views', pattern: /\b[Ff]ull views?\b/, retired: false },
  { word: 'MAY NOT', pattern: /^(?:MAY|MAY NOT|may|may not)$/, retired: false },
]

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
  return SOURCE_FILES.filter((f) => !entry.skip?.(f)).flatMap((f) =>
    userFacingStrings(readFileSync(join(process.cwd(), f), 'utf8'), f)
      .filter((s) => entry.pattern.test(s.text))
      .map((s) => `${f}:${s.line}: ${s.text}`))
}
