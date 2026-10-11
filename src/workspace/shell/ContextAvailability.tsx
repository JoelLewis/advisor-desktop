import { useEffect } from 'react'

type ContextAvailabilityProps = { useAvailable: () => boolean; onChange: (available: boolean) => void }

/** Reports whether the route's context column has anything to show. Keyed by route, so each route's hook keeps a stable call order. */
export function ContextAvailability({ useAvailable, onChange }: ContextAvailabilityProps) {
  const available = useAvailable()
  useEffect(() => onChange(available), [available, onChange])
  return null
}
