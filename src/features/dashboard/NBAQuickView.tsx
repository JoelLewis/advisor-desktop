import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { CATEGORY_CONFIG } from '@/components/ui/NBACard'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useNBAs } from '@/hooks/use-nbas'
import { useUIStore } from '@/store/ui-store'
import type { NBA } from '@/types/nba'

function UrgencyBadge({ urgency }: { urgency: number }) {
  if (urgency > 80) return <Badge variant="red">Time-Critical</Badge>
  if (urgency > 60) return <Badge variant="yellow">This Week</Badge>
  if (urgency > 40) return <Badge variant="blue">This Month</Badge>
  return <Badge variant="default">When Convenient</Badge>
}

export function NBAQuickView() {
  const { data: nbas, isLoading } = useNBAs({ dismissed: 'false' })
  const navigate = useNavigate()
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)

  const top5 = useMemo(() => {
    if (!nbas) return []
    return [...nbas]
      .filter((n) => !n.contextRelevance || n.contextRelevance === 'all' || n.contextRelevance === 'dashboard')
      .sort((a, b) => b.scoring.composite - a.scoring.composite)
      .slice(0, 5)
  }, [nbas])

  const totalCount = nbas?.length ?? 0

  function handleAction(nba: NBA) {
    const route = nba.actionRoute
    if (route) {
      if (route.path) {
        const search = route.params ? '?' + new URLSearchParams(route.params).toString() : ''
        navigate(route.path + search)
      }
      if (route.openAI && route.aiMessage) {
        setInitialMessage(route.aiMessage)
      } else if (!route.path) {
        setInitialMessage(`Take action on: "${nba.title}" — ${nba.description}`)
      }
    } else {
      setInitialMessage(`Take action on: "${nba.title}" — ${nba.description}`)
    }
  }

  return (
    <Card>
      <CardHeader
        action={
          <Link
            to="/actions"
            className="flex items-center gap-1 text-caption font-medium text-accent-blue hover:underline"
          >
            View all {totalCount} actions
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-text-tertiary" />
          Next Best Actions
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : top5.length > 0 ? (
          <div className="space-y-1">
            {top5.map((nba) => {
              const config = CATEGORY_CONFIG[nba.category]
              const CategoryIcon = config.icon
              return (
                <button
                  key={nba.id}
                  onClick={() => handleAction(nba)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-tertiary"
                >
                  <CategoryIcon className="h-4 w-4 shrink-0 text-text-tertiary" />
                  <span className="flex-1 truncate text-body text-text-primary">{nba.title}</span>
                  <span className="shrink-0 truncate text-caption text-text-tertiary max-w-[120px]">
                    {nba.clients[0]?.name}
                  </span>
                  <UrgencyBadge urgency={nba.scoring.urgency} />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-caption text-text-tertiary">
            No pending actions
          </div>
        )}
      </CardContent>
    </Card>
  )
}
