export type Binding = { key: string; label: string; run: () => void }
export type Destination = { id: string; label: string; aliases: string[]; run: () => void }

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable === true
}

/** A label reads "Kind · Name"; the name is what someone types when they know exactly where they are going. */
const SEPARATOR = ' · '
const nameIn = (label: string) => (label.includes(SEPARATOR) ? label.slice(label.lastIndexOf(SEPARATOR) + SEPARATOR.length) : label)
const namesOf = (d: Destination) => [d.label, nameIn(d.label), ...d.aliases].map((n) => n.toLowerCase())

/** Destinations whose label or alias contains the query, those named exactly by it first. */
export function matchDestinations(query: string, destinations: Destination[]): Destination[] {
  const q = query.trim().toLowerCase()
  if (!q) return destinations
  const matching = destinations.filter((d) => namesOf(d).some((name) => name.includes(q)))
  const named = matching.filter((d) => namesOf(d).includes(q))
  return [...named, ...matching.filter((d) => !named.includes(d))]
}
