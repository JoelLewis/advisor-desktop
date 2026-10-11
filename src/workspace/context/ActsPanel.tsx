import { RecordTrail } from '@/kit/record-trail/RecordTrail'
import { ActRecordSlip } from '@/workspace/thread/ActRecordSlip'
import { ACT_KIND_LABEL } from '@/workspace/thread/act-kind-label'
import { personIn } from '@/workspace/people/directory-people'
import type { BindingAct, Directory } from '@/types/workspace'
import { actAnchorId } from './act-anchor'
import { ContextSection } from './ContextSection'

export function ActsPanel({ acts, directory }: { acts: BindingAct[]; directory: Directory }) {
  return (
    <ContextSection title="Binding acts">
      {acts.length === 0 ? <p className="text-body text-ink-3">None in this thread</p> : (
        <>
          <RecordTrail steps={acts.map((a) => ({ label: ACT_KIND_LABEL[a.kind], actor: personIn(directory, a.actorId).name, state: 'DONE', at: a.at }))} />
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
