import { RecordTrail } from '@/kit/record-trail/RecordTrail'
import { ActRecordSlip } from '@/workspace/thread/ActRecordSlip'
import { actWording } from '@/workspace/thread/act-kind-label'
import { personIn } from '@/workspace/people/directory-people'
import type { BindingAct, Directory } from '@/types/workspace'
import { actAnchorId } from './act-anchor'
import { ContextSection } from './ContextSection'

type ActsPanelProps = { acts: BindingAct[]; directory: Directory; viewerIsExternal: boolean }

export function ActsPanel({ acts, directory, viewerIsExternal }: ActsPanelProps) {
  const steps = acts.map((a) => {
    const actor = personIn(directory, a.actorId)
    return { label: actWording(a, actor, viewerIsExternal).trailLabel, actor: actor.name, state: 'DONE' as const, at: a.at }
  })
  return (
    <ContextSection title={viewerIsExternal ? 'Records' : 'Audit trail'}>
      {acts.length === 0 ? <p className="text-body text-ink-3">None in this thread</p> : (
        <>
          <RecordTrail steps={steps} />
          {acts.map((a) => (
            <div key={a.id} id={actAnchorId(a.id)} tabIndex={-1}>
              <ActRecordSlip act={a} directory={directory} />
            </div>
          ))}
        </>
      )}
    </ContextSection>
  )
}
