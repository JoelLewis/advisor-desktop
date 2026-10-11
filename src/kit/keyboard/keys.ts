export type Binding = { key: string; label: string; run: () => void }
export type Destination = { id: string; label: string; aliases: string[]; run: () => void }

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable === true
}

export function matchDestinations(query: string, destinations: Destination[]): Destination[] {
  const q = query.trim().toLowerCase()
  if (!q) return destinations
  return destinations.filter((d) => [d.label, ...d.aliases].some((name) => name.toLowerCase().includes(q)))
}
