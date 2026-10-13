import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { DataTable } from '@/kit/data-table/DataTable'
import { NotApplicable } from '@/kit/data-table/NotApplicable'
import { Tag } from '@/kit/tag/Tag'
import { fmtDate } from '@/kit/measure'
import { useDeliverDisclosure } from '@/hooks/use-prospect-work'
import { personIn } from '@/workspace/people/directory-people'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import type { Directory } from '@/types/workspace'
import { AT_ONBOARDING, type DisclosureDocument, type ProspectView } from '@/types/workspace-prospect'
import { DISCLOSURE_SHORT, ONBOARDING_STATUS_WORDS } from './prospect-words'

type Props = { view: ProspectView; directory: Directory; canDeliver: boolean; onRecorded: (actId: string) => void }

/** The onboarding her acceptance opened: each item, its owner, its trading-day due date and where it stands; the deliveries it waits for. */
export function OnboardingChecklist({ view, directory, canDeliver, onRecorded }: Props) {
  const deliver = useDeliverDisclosure(view.id)
  const [confirming, setConfirming] = useState<DisclosureDocument>()
  const onboarding = view.onboarding
  if (!onboarding) return null
  const deliverable = canDeliver ? view.deliverable.filter((d) => AT_ONBOARDING.has(d)) : []
  return (
    <div className="flex flex-col gap-3">
      <DataTable caption="Onboarding checklist" rows={onboarding.items} getRowId={(i) => i.id} noun={{ singular: 'item', plural: 'items' }} density="dense"
        columns={[
          { id: 'item', header: 'Item · owner', wrap: true, cell: (i) => (
            <span className="flex flex-col">
              <span>{i.label}</span>
              <span className="text-ink-3">{personIn(directory, i.ownerId).name}</span>
            </span>
          ) },
          { id: 'status', header: 'State', wrap: true, cell: (i) => <Tag wrap tone={i.status === 'delivered' ? 'solid' : 'outline'}>{ONBOARDING_STATUS_WORDS[i.status]}</Tag> },
          { id: 'due', header: 'Due', cell: (i) => (i.due ? <span className="tabular">{fmtDate(i.due)}</span> : <NotApplicable />), sortValue: (i) => i.due ?? '' },
        ]} />
      {deliverable.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {deliverable.map((d) => <Button key={d} rank="secondary" onClick={() => { deliver.reset(); setConfirming(d) }}>{`Deliver ${DISCLOSURE_SHORT[d]}`}</Button>)}
        </div>
      ) : null}
      {confirming ? (
        <ConfirmRecord open onClose={() => setConfirming(undefined)} mutation={deliver} variables={confirming} onRecorded={onRecorded}
          title={`Deliver ${DISCLOSURE_SHORT[confirming]} to ${view.name}?`} description="Delivery is a binding act: the record names you, the document and the time." />
      ) : null}
    </div>
  )
}
