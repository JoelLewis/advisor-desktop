/** Why the Approve button is disabled, if it is: the engine refuses the same cases again on the request. */
export function approveBlocker({ blocked, hasLegs, attested }: { blocked: boolean; hasLegs: boolean; attested: boolean }): string | undefined {
  if (blocked) return 'The pre-trade check blocks this version, so it cannot be approved.'
  if (!hasLegs) return 'This version has no legs to approve.'
  if (!attested) return 'Confirm your review above to approve.'
  return undefined
}
