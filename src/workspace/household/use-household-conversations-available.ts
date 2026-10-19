import { useParams } from 'react-router-dom'
import { useHousehold } from '@/hooks/use-meetings'

/** The household's conversations show unless the household is not found or failed to load; the page says why. */
export function useHouseholdConversationsAvailable(): boolean {
  const { householdId } = useParams()
  if (!householdId) throw new Error('The household column needs a household id')
  return !useHousehold(householdId).isError
}
