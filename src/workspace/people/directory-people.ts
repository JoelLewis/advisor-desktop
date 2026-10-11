import type { Directory, Person } from '@/types/workspace'

export function personIn(directory: Directory, id: string): Person {
  const person = directory.people.find((p) => p.id === id)
  if (!person) throw new Error(`No person "${id}" in the directory`)
  return person
}

export const firstNameOf = (person: Person) => person.name.split(' ')[0] ?? person.name

/** Whether the viewer is a client, read from their role in the directory the engine served them. */
export const isClientViewer = (directory: Directory, viewerId: string) =>
  directory.people.some((p) => p.id === viewerId && p.role === 'client')
