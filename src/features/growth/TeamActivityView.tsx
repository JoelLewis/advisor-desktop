import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTeamActivity } from '@/hooks/use-practice'
import type { TeamMemberRole } from '@/types/practice'

const ROLE_BADGE_VARIANT: Record<TeamMemberRole, 'purple' | 'blue' | 'yellow' | 'green'> = {
  advisor: 'purple',
  csa: 'blue',
  analyst: 'yellow',
  compliance: 'green',
}

const ROLE_AVATAR_BG: Record<TeamMemberRole, string> = {
  advisor: 'bg-accent-purple/20 text-accent-purple',
  csa: 'bg-accent-blue/20 text-accent-blue',
  analyst: 'bg-amber-100 text-amber-700',
  compliance: 'bg-accent-green/20 text-accent-green',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TeamActivityView() {
  const { data: team, isLoading } = useTeamActivity()

  if (isLoading || !team) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    )
  }

  const totalActive = team.reduce((sum, m) => sum + m.activeTasks, 0)
  const totalCompleted = team.reduce((sum, m) => sum + m.completedThisWeek, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Active Tasks" value={String(totalActive)} />
        <MetricCard label="Completed This Week" value={String(totalCompleted)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {team.map((member) => (
          <Card key={member.memberId}>
            <CardContent className="py-4 px-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-body font-semibold ${ROLE_AVATAR_BG[member.role]}`}
                  >
                    {getInitials(member.memberName)}
                  </div>
                  <div>
                    <p className="text-body-strong">{member.memberName}</p>
                    <Badge variant={ROLE_BADGE_VARIANT[member.role]}>{member.role}</Badge>
                  </div>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="font-mono text-section-header">{member.activeTasks}</p>
                    <p className="text-caption text-text-secondary">Active</p>
                  </div>
                  <div>
                    <p className="font-mono text-section-header">{member.completedThisWeek}</p>
                    <p className="text-caption text-text-secondary">Completed</p>
                  </div>
                  <div>
                    <p className="font-mono text-section-header">{member.pendingTasks}</p>
                    <p className="text-caption text-text-secondary">Pending</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-border-primary pt-3">
                <span className="text-caption text-text-secondary">Current Focus: </span>
                <span className="text-caption text-text-primary">{member.currentFocus}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
