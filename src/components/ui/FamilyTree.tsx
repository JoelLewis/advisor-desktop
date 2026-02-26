import { Avatar } from './Avatar'
import { cn } from '@/lib/utils'
import type { HouseholdMember } from '@/types/household'

const RELATIONSHIP_LABELS: Record<string, string> = {
  primary: 'Primary',
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  other: 'Related',
}

type FamilyTreeProps = {
  members: HouseholdMember[]
  onMemberClick?: (clientId: string) => void
  className?: string
}

export function FamilyTree({ members, onMemberClick, className }: FamilyTreeProps) {
  const primary = members.find((m) => m.relationship === 'primary')
  const spouse = members.find((m) => m.relationship === 'spouse')
  const others = members.filter((m) => m.relationship !== 'primary' && m.relationship !== 'spouse')

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Primary + Spouse row */}
      <div className="flex items-center gap-6">
        {primary && (
          <MemberNode member={primary} onClick={onMemberClick} />
        )}
        {spouse && (
          <>
            <div className="h-px w-8 bg-border-primary" />
            <MemberNode member={spouse} onClick={onMemberClick} />
          </>
        )}
      </div>

      {/* Connector line */}
      {others.length > 0 && (
        <div className="h-6 w-px bg-border-primary" />
      )}

      {/* Other members */}
      {others.length > 0 && (
        <div className="flex items-start gap-6">
          {others.map((member) => (
            <MemberNode key={member.clientId} member={member} onClick={onMemberClick} />
          ))}
        </div>
      )}
    </div>
  )
}

function MemberNode({
  member,
  onClick,
}: {
  member: HouseholdMember
  onClick?: (clientId: string) => void
}) {
  return (
    <button
      onClick={() => onClick?.(member.clientId)}
      className="flex flex-col items-center gap-2 rounded-lg border border-border-primary bg-surface-primary p-3 transition-all hover:border-accent-blue hover:shadow-md"
    >
      <Avatar name={member.name} size="md" />
      <div className="text-center">
        <p className="text-body-strong">{member.name}</p>
        <p className="text-caption text-text-tertiary">
          {RELATIONSHIP_LABELS[member.relationship] ?? member.relationship}
        </p>
      </div>
    </button>
  )
}
