import { RecordSlip } from '@/kit/record-slip/RecordSlip'
import { personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import type { BindingAct, Directory } from '@/types/workspace'
import { ACT_KIND_LABEL } from './act-kind-label'

export function ActRecordSlip({ act, directory }: { act: BindingAct; directory: Directory }) {
  const actor = personIn(directory, act.actorId)
  return (
    <RecordSlip kind={`${ACT_KIND_LABEL[act.kind]} · binding`} title={act.summary} recordId={act.id} fingerprint={act.fingerprint}
      recordedBy={{ name: actor.name, role: ROLE_LABEL[actor.role] }} at={act.at} archive="Supervisory review" />
  )
}
