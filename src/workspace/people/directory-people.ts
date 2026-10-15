import type { Directory, Person } from '@/types/workspace'
import { isExternalRole } from '@/lib/external-party'

export function personIn(directory: Directory, id: string): Person {
  const person = directory.people.find((p) => p.id === id)
  if (!person) throw new Error(`No person "${id}" in the directory`)
  return person
}

/** Whether the viewer is outside the firm (a client or a prospect), read from their role in the directory the engine served them. */
export const isExternalViewerIn = (directory: Directory, viewerId: string) =>
  directory.people.some((p) => p.id === viewerId && isExternalRole(p.role))
