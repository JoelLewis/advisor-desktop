import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchEntities } from '@/services/search'

export function useCommandSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchEntities(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  })

  return {
    query,
    setQuery,
    results: data?.results ?? [],
    isLoading: isLoading && debouncedQuery.length >= 2,
  }
}
