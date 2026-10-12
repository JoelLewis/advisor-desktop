/** "a", "a and b", "a, b and c". */
export function joinWords(words: readonly string[]): string {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** "Robert Johnson" → "Robert". */
export function firstNameOf(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName
}
