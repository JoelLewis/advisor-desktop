import { ActivityItemRow } from '@/components/ui/ActivityItem'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardHeader } from '@/components/ui/Card'
import { useActivity } from '@/hooks/use-activity'

export function ActivityStream() {
  const { data, isLoading } = useActivity()

  return (
    <Card>
      <CardHeader>Recent Activity</CardHeader>
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : data?.items && data.items.length > 0 ? (
          <div className="divide-y divide-border-primary">
            {data.items.slice(0, 15).map((item) => (
              <ActivityItemRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex h-20 flex-col items-center justify-center gap-1">
            <p className="text-caption text-text-tertiary">No recent activity</p>
            <p className="text-caption text-text-tertiary">Activity will appear here as you work with clients.</p>
          </div>
        )}
      </div>
    </Card>
  )
}
