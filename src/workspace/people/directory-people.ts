import type { Directory, Person } from '@/types/workspace'

export function personIn(directory: Directory, id: string): Person {
  const person = directory.people.find((p) => p.id === id)
  if (!person) throw new Error(`No person "${id}" in the directory`)
  return person
}

export const firstNameOf = (person: Person) => person.name.split(' ')[0] ?? person.name
