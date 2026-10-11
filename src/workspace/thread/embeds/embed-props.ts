import type { Subject } from '@/types/workspace'

export type EmbedProps = { subject: Subject }

/** Embeds in Phase 2 measure an account; any other subject is a seed error, reported rather than guessed around. */
export function accountIdOf(subject: Subject, embed: string): string {
  if (subject.type !== 'account') throw new Error(`The ${embed} embed needs an account subject, got ${subject.type} ${subject.id}`)
  return subject.id
}
