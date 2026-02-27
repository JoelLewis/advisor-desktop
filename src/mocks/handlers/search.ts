import { http, HttpResponse } from 'msw'
import { clients } from '../data/clients'
import { households } from '../data/households'
import { accounts } from '../data/accounts'
import { formatAUM } from './utils'

type SearchResult = {
  id: string
  type: 'client' | 'account' | 'household' | 'page' | 'action'
  title: string
  subtitle: string
  route: string
}

const PAGES: SearchResult[] = [
  { id: 'page-dashboard', type: 'page', title: 'Dashboard', subtitle: 'Overview & quick view', route: '/dashboard' },
  { id: 'page-actions', type: 'page', title: 'Actions', subtitle: 'Next Best Actions & effectiveness', route: '/actions' },
  { id: 'page-clients', type: 'page', title: 'Client List', subtitle: 'All clients', route: '/clients' },
  { id: 'page-households', type: 'page', title: 'Households', subtitle: 'Household management', route: '/households' },
  { id: 'page-portfolios', type: 'page', title: 'Portfolios', subtitle: 'Accounts & positions', route: '/portfolios' },
  { id: 'page-rebalance', type: 'page', title: 'Rebalance', subtitle: 'Portfolio rebalancing wizard', route: '/portfolios/rebalance' },
  { id: 'page-risk', type: 'page', title: 'Risk Analytics', subtitle: 'Risk metrics & scenarios', route: '/portfolios/risk' },
  { id: 'page-prospects', type: 'page', title: 'Prospects', subtitle: 'Pipeline & growth', route: '/growth' },
  { id: 'page-revenue', type: 'page', title: 'Revenue', subtitle: 'Fees & AUM tracking', route: '/growth/revenue' },
  { id: 'page-engage', type: 'page', title: 'Engage', subtitle: 'Client communications & campaigns', route: '/engage' },
  { id: 'page-workflows', type: 'page', title: 'Workflow Center', subtitle: 'Tasks & processes', route: '/workflows' },
  { id: 'page-settings', type: 'page', title: 'Settings', subtitle: 'AI & notification preferences', route: '/settings' },
  { id: 'page-onboard', type: 'page', title: 'Client Onboarding', subtitle: 'New client wizard', route: '/clients/onboard' },
]

const ACTIONS: SearchResult[] = [
  { id: 'action-rebalance', type: 'action', title: 'Rebalance Portfolios', subtitle: 'Start rebalancing wizard', route: '/portfolios/rebalance' },
  { id: 'action-new-client', type: 'action', title: 'Onboard New Client', subtitle: 'Start onboarding wizard', route: '/clients/onboard' },
  { id: 'action-open-ai', type: 'action', title: 'Open AI Assistant', subtitle: 'Ask AI anything', route: '__ai__' },
]

function matchScore(text: string, query: string): number {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  if (lower === q) return 100
  if (lower.startsWith(q)) return 80
  if (lower.includes(q)) return 60
  return 0
}

export const searchHandlers = [
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')?.trim() ?? ''

    if (query.length < 2) {
      return HttpResponse.json({ results: [], query })
    }

    const results: (SearchResult & { _score: number })[] = []

    // Search clients
    for (const c of clients) {
      const nameScore = matchScore(c.fullName, query)
      const emailScore = matchScore(c.email, query)
      const score = Math.max(nameScore, emailScore)
      if (score > 0) {
        results.push({
          id: c.id, type: 'client', title: c.fullName,
          subtitle: `${c.segment} · ${formatAUM(c.totalAUM)}`,
          route: `/clients/${c.id}`, _score: score,
        })
      }
    }

    // Search households
    for (const h of households) {
      const score = matchScore(h.name, query)
      if (score > 0) {
        results.push({
          id: h.id, type: 'household', title: h.name,
          subtitle: `${h.members.length} members · ${formatAUM(h.totalAUM)}`,
          route: `/households/${h.id}`, _score: score,
        })
      }
    }

    // Search accounts
    for (const a of accounts) {
      const nameScore = matchScore(a.name, query)
      const numScore = matchScore(a.accountNumber, query)
      const score = Math.max(nameScore, numScore)
      if (score > 0) {
        results.push({
          id: a.id, type: 'account', title: a.name,
          subtitle: `${a.accountNumber} · ${formatAUM(a.totalValue)}`,
          route: `/portfolios/accounts/${a.id}`, _score: score,
        })
      }
    }

    // Search pages
    for (const p of PAGES) {
      const titleScore = matchScore(p.title, query)
      const subScore = matchScore(p.subtitle, query)
      const score = Math.max(titleScore, subScore)
      if (score > 0) {
        results.push({ ...p, _score: score - 10 })
      }
    }

    // Search actions (prefixed with >)
    const isActionQuery = query.startsWith('>')
    const actionQuery = isActionQuery ? query.slice(1).trim() : query
    if (isActionQuery || actionQuery.length >= 3) {
      for (const a of ACTIONS) {
        const score = matchScore(a.title, actionQuery)
        if (score > 0 || isActionQuery) {
          results.push({ ...a, _score: isActionQuery ? 90 : score - 20 })
        }
      }
    }

    // Sort by score desc, limit to 12
    results.sort((a, b) => b._score - a._score)
    const trimmed = results.slice(0, 12).map(({ _score: _, ...r }) => r)

    return HttpResponse.json({ results: trimmed, query })
  }),
]
