import { useLayoutEffect } from 'react'

type ContextAvailabilityProps = { useAvailable: () => boolean; onChange: (available: boolean) => void }

/**
 * Reports whether the route's context column has anything to show. Keyed by route, so each route's hook keeps a stable call order.
 * A layout effect, so a column with nothing to show is gone before the page's "not found" is painted beside it.
 */
export function ContextAvailability({ useAvailable, onChange }: ContextAvailabilityProps) {
  const available = useAvailable()
  useLayoutEffect(() => onChange(available), [available, onChange])
  return null
}
