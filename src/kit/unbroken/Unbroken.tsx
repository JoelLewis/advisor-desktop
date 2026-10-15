/** A record id (REC-0003, brk-002) or an ISO date (2026-03-02): each breaks only before or after, never at its hyphen. */
const KEPT_WHOLE = /(\b[A-Za-z]{2,}-\d+\b|\b\d{4}-\d{2}-\d{2}\b)/

/** Running text in which every record id and ISO date stays on one line, set in tabular figures. */
export function Unbroken({ text }: { text: string }) {
  const parts = text.split(KEPT_WHOLE)
  if (parts.length === 1) return text
  // split() with a capturing group puts the kept tokens at the odd indexes.
  return parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="tabular whitespace-nowrap">{part}</span> : part))
}
