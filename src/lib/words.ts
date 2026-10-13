/** "a", "a and b", "a, b and c". */
export function joinWords(words: readonly string[]): string {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** "Robert Johnson" → "Robert". */
export function firstNameOf(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName
}

const HONORIFICS: ReadonlySet<string> = new Set(['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Mx.'])

/** How a letter or a button addresses someone: "Dr. Amanda Pell" → "Dr. Pell"; "Robert Johnson" → "Robert". */
export function addressNameOf(fullName: string): string {
  const words = fullName.split(' ')
  const first = words[0] ?? fullName
  return HONORIFICS.has(first) && words.length > 1 ? `${first} ${words[words.length - 1]}` : first
}
