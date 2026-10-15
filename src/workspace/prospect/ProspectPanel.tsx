import { Tag } from '@/kit/tag/Tag'
import { useProspect } from '@/hooks/use-prospect-work'
import { PRESENTER_ID } from '@/lib/presenter'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ContextSection } from '@/workspace/context/ContextSection'
import type { Directory } from '@/types/workspace'
import { ActAsProspect } from './ActAsProspect'
import { DisclosureTimeline } from './DisclosureTimeline'
import { ProspectClock } from './ProspectClock'
import { SendProposal } from './SendProposal'
import { STAGE_WORDS } from './prospect-words'

type Props = { prospectId: string; directory: Directory; onRecorded: (actId: string) => void }

/** Her thread's context, for the firm: where she stands, what she has been given, the clock, the send, and the presenter's shortcut. */
export function ProspectPanel({ prospectId, directory, onRecorded }: Props) {
  const { viewerId } = useViewer()
  const prospect = useProspect(prospectId)
  if (prospect.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading the prospect…</p>
  if (prospect.isError) return <p role="alert" className="py-5 text-body">{prospect.error.message}</p>
  const view = prospect.data
  const permissions = directory.permissions[viewerId] ?? []
  // The one presenter moves the clock and acts for her; the engine refuses anyone else.
  const presents = viewerId === PRESENTER_ID
  return (
    <>
      <ContextSection title="Prospect">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Tag tone="solid">{STAGE_WORDS[view.stage]}</Tag>
          {view.referrerName ? <span className="text-body text-ink-2">{`Referred by ${view.referrerName}`}</span> : null}
        </div>
      </ContextSection>
      <DisclosureTimeline view={view} canDeliver={permissions.includes('deliver_disclosure')} onRecorded={onRecorded} />
      <ProspectClock view={view} canRecordCoffee={permissions.includes('prepare_meeting')} presents={presents} />
      <SendProposal view={view} canSend={permissions.includes('send_to_party')} onRecorded={onRecorded} />
      {presents ? <ActAsProspect view={view} onRecorded={onRecorded} /> : null}
    </>
  )
}
