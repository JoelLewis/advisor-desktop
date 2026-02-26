import { get } from './api-client'

type SearchResultType = 'client' | 'account' | 'household' | 'page' | 'action'

type SearchResult = {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  route: string
}

type SearchResponse = {
  results: SearchResult[]
  query: string
}

export type { SearchResult, SearchResultType, SearchResponse }

export function searchEntities(query: string) {
  return get<SearchResponse>('/search', { q: query })
}
