import { RecordSlip } from '@/kit/record-slip/RecordSlip'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { isExternalViewerIn, personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/lib/role-label'
import { sentLetterOrigin } from '@/workspace/context/draft-origin'
import type { Directory, ServedAct } from '@/types/workspace'
import { actProvenance } from './act-provenance'
import { actWording } from './act-kind-label'

export function ActRecordSlip({ act, directory }: { act: ServedAct; directory: Directory }) {
  const { viewerId } = useViewer()
  const actor = personIn(directory, act.actorId)
  const viewerIsExternal = isExternalViewerIn(directory, viewerId)
  const { kind, title, archive } = actWording(act, actor, viewerIsExternal)
  const origin = viewerIsExternal ? undefined : sentLetterOrigin(act, directory)
  // Firm-only: a client's slip never carries the firm's provenance.
  const lines = viewerIsExternal ? [] : [...(origin ? [origin] : []), ...actProvenance(act, directory)]
  return (
    <RecordSlip kind={kind} title={title} audit={viewerIsExternal ? undefined : { recordId: act.id, fingerprint: act.fingerprint }}
      recordedBy={{ name: actor.name, role: ROLE_LABEL[actor.role] }} at={act.at} archive={archive}>
      {lines.length > 0 ? (
        <span className="flex flex-col gap-1 text-label text-ink-2">
          {lines.map((line) => <span key={line} className="whitespace-pre-line">{line}</span>)}
        </span>
      ) : undefined}
    </RecordSlip>
  )
}
