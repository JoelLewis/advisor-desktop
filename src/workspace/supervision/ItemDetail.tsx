import { useId } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { actAnchorId } from '@/workspace/context/act-anchor'
import { ActRecordSlip } from '@/workspace/thread/ActRecordSlip'
import type { Directory } from '@/types/workspace'
import { AlertEvidence } from './AlertEvidence'
import { CorrespondenceEvidence } from './CorrespondenceEvidence'
import { OrdersEvidence } from './OrdersEvidence'
import { ITEM_HEADING, type FoundItem } from './supervision-items'

/** One item beside the queue: its evidence, and the records compliance made on it today. */
export function ItemDetail({ found, directory }: { found: FoundItem; directory: Directory }) {
  const titleId = useId()
  const { item, recorded } = found
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-6">
      <h2 id={titleId} className="text-copy font-semibold">{`${ITEM_HEADING[item.kind]} · ${item.title}`}</h2>
      {item.kind === 'orders' ? <OrdersEvidence item={item} directory={directory} />
        : item.kind === 'alert' ? <AlertEvidence item={item} />
        : <CorrespondenceEvidence item={item} directory={directory} />}
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
