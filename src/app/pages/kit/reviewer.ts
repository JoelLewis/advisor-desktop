const NAME_AND_ROLE = /^(.+?)\s*\(([^()]+)\)$/

export function splitReviewer(reviewer: string): { name: string; role: string } {
  const match = NAME_AND_ROLE.exec(reviewer.trim())
  if (!match?.[1] || !match[2]) throw new Error(`Supervision reviewer "${reviewer}" states no role`)
  return { name: match[1], role: match[2] }
}
