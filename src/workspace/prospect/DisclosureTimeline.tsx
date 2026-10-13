import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Tag } from '@/kit/tag/Tag'
import { fmtTimestamp } from '@/kit/measure'
import { useDeliverDisclosure } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { DISCLOSURE_DOCUMENTS, DISCLOSURE_TITLES, type DisclosureDocument, type ProspectView } from '@/types/workspace-prospect'
import { DISCLOSURE_SHORT, DISCLOSURE_TIMING } from './prospect-words'

type Props = { view: ProspectView; canDeliver: boolean; onRecorded: (actId: string) => void }

/** Each disclosure: delivered when, by which record — or, when it may be delivered now, the binding act that delivers it. */
export function DisclosureTimeline({ view, canDeliver, onRecorded }: Props) {
  const deliver = useDeliverDisclosure(view.id)
  const [confirming, setConfirming] = useState<DisclosureDocument>()
  return (
    <ContextSection title="Disclosures">
      <ol aria-label="Disclosures" className="flex flex-col gap-3">
        {DISCLOSURE_DOCUMENTS.map((document) => {
          const delivered = view.disclosures.find((d) => d.document === document)
          return (
            <li key={document} className="flex flex-col items-start gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-body">{DISCLOSURE_TITLES[document]}</span>
                {delivered ? <Tag tone="solid">Delivered</Tag> : null}
              </div>
              {delivered
                ? <span className="tabular text-label text-ink-3">{`${fmtTimestamp(delivered.at)} · ${delivered.actId}`}</span>
                : <span className="text-label text-ink-3">{DISCLOSURE_TIMING[document]}</span>}
              {!delivered && canDeliver && view.deliverable.includes(document) ? (
                <Button rank="secondary" onClick={() => { deliver.reset(); setConfirming(document) }}>{`Deliver ${DISCLOSURE_SHORT[document]}`}</Button>
              ) : null}
            </li>
          )
        })}
      </ol>
      {confirming ? (
        <ConfirmRecord open onClose={() => setConfirming(undefined)} mutation={deliver} variables={confirming} onRecorded={onRecorded}
          title={`Deliver ${DISCLOSURE_SHORT[confirming]} to ${view.name}?`}
          description="Delivery is a binding act: the record names you, the document and the time, and she sees it in her thread." />
      ) : null}
    </ContextSection>
  )
}
