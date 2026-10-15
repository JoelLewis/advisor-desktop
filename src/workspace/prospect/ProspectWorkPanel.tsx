import { fmtDayMonthYear } from '@/kit/measure'
import { useProspect } from '@/hooks/use-prospect-work'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { personIn } from '@/workspace/people/directory-people'
import { ContextSection } from '@/workspace/context/ContextSection'
import type { Directory } from '@/types/workspace'
import { AcceptanceSlip } from './AcceptanceSlip'
import { OnboardingChecklist } from './OnboardingChecklist'
import { ProspectApproval } from './ProspectApproval'

type Props = { prospectId: string; directory: Directory; onRecorded: (actId: string) => void }

/** The internal thread's context: the approval with its best-interest record, the follow-ups, and the onboarding checklist. */
export function ProspectWorkPanel({ prospectId, directory, onRecorded }: Props) {
  const { viewerId } = useViewer()
  const prospect = useProspect(prospectId)
  if (prospect.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading the prospect…</p>
  if (prospect.isError) return <p role="alert" className="py-5 text-body">{prospect.error.message}</p>
  const view = prospect.data
  const canDeliver = (directory.permissions[viewerId] ?? []).includes('deliver_disclosure')
  return (
    <>
      {view.proposals.map((p) => <ProspectApproval key={p.id} detail={p} directory={directory} onRecorded={onRecorded} />)}
      {view.tasks.length > 0 ? (
        <ContextSection title="Follow-up">
          <ul className="flex flex-col gap-1.5">
            {view.tasks.map((t) => <li key={t.id} className="tabular text-body">{`${t.text} · ${personIn(directory, t.ownerId).name} · due ${fmtDayMonthYear(t.due)}`}</li>)}
          </ul>
        </ContextSection>
      ) : null}
      {view.onboarding ? (
        <ContextSection title="Onboarding">
          <AcceptanceSlip threadId={view.threadId} actId={view.onboarding.acceptanceActId} directory={directory} />
          <OnboardingChecklist view={view} directory={directory} canDeliver={canDeliver} onRecorded={onRecorded} />
        </ContextSection>
      ) : null}
    </>
  )
}
