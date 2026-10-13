import { useEffect, useId, useState } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { actAnchorId } from '@/workspace/context/act-anchor'
import { ActRecordSlip } from '@/workspace/thread/ActRecordSlip'
import type { Directory } from '@/types/workspace'
import { AlertEvidence } from './AlertEvidence'
import { CorrespondenceEvidence } from './CorrespondenceEvidence'
import { DispositionPanel } from './DispositionPanel'
import { OrdersEvidence } from './OrdersEvidence'
import { ITEM_HEADING, type FoundItem } from './supervision-items'

type ItemDetailProps = { found: FoundItem; directory: Directory; onRefused: (message: string) => void }

/** One item beside the queue: its evidence, the disposition compliance may record, and what it recorded today. */
export function ItemDetail({ found, directory, onRefused }: ItemDetailProps) {
  const titleId = useId()
  const focusAfter = useFocusAfter()
  const [recordedId, setRecordedId] = useState<string>()
  const { item, recorded, open } = found
  const slipShown = recordedId !== undefined && recorded.some((a) => a.id === recordedId)
  // Focus waits for the refreshed queue to show the slip.
  useEffect(() => {
    if (recordedId && slipShown) focusAfter(actAnchorId(recordedId))
  }, [recordedId, slipShown, focusAfter])
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-6">
      <h2 id={titleId} className="text-copy font-semibold">{`${ITEM_HEADING[item.kind]} · ${item.title}`}</h2>
      {item.kind === 'orders' ? <OrdersEvidence item={item} directory={directory} />
        : item.kind === 'alert' ? <AlertEvidence item={item} />
        : <CorrespondenceEvidence item={item} directory={directory} />}
      <DispositionPanel item={item} open={open} directory={directory} onRecorded={setRecordedId} onRefused={onRefused} />
      {recorded.length > 0 ? (
        <Pane title="Recorded today">
          <ul className="flex flex-col gap-3">
            {recorded.map((act) => (
              <li key={act.id} id={actAnchorId(act.id)} tabIndex={-1}><ActRecordSlip act={act} directory={directory} /></li>
            ))}
          </ul>
        </Pane>
      ) : null}
    </section>
  )
}
