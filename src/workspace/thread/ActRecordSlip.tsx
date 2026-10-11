import { RecordSlip } from '@/kit/record-slip/RecordSlip'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { isClientViewer, personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import type { BindingAct, Directory } from '@/types/workspace'
import { actWording } from './act-kind-label'

export function ActRecordSlip({ act, directory }: { act: BindingAct; directory: Directory }) {
  const { viewerId } = useViewer()
  const actor = personIn(directory, act.actorId)
  const { kind, title, archive } = actWording(act, actor, isClientViewer(directory, viewerId))
  return (
    <RecordSlip kind={kind} title={title} recordId={act.id} fingerprint={act.fingerprint}
      recordedBy={{ name: actor.name, role: ROLE_LABEL[actor.role] }} at={act.at} archive={archive} />
  )
}
