import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { fmtTimestamp } from '@/kit/measure'
import { sentLetterOrigin } from '@/workspace/context/draft-origin'
import { personIn } from '@/workspace/people/directory-people'
import type { Directory } from '@/types/workspace'
import type { CorrespondenceItem } from '@/types/workspace-supervision'

/** The message exactly as the client received it, and — firm-only — where it came from. */
export function CorrespondenceEvidence({ item, directory }: { item: CorrespondenceItem; directory: Directory }) {
  const sender = personIn(directory, item.message.authorId)
  const origin = sentLetterOrigin(item.sendAct, directory) ?? `Written by ${sender.name}; no agent draft.`
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Pane title="As the client saw it">
        <VisibilityBand visibility="client" scale="message" audience={item.clientName} />
        <p className="tabular text-label text-ink-3">{`Sent by ${sender.name} · ${fmtTimestamp(item.message.at)}`}</p>
        <p className="whitespace-pre-line text-copy">{item.message.body}</p>
      </Pane>
      <Pane title="Provenance">
        <VisibilityBand visibility="internal" scale="message" />
        <p className="text-body">{origin}</p>
        <p className="tabular text-label text-ink-3">{`Record ${item.sendAct.id} · fingerprint ${item.sendAct.fingerprint}`}</p>
      </Pane>
      {item.flagged ? (
        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone="solid">FLAGGED</Tag>
          <span className="text-ink-2">Flagged for follow-up; it stays in the queue until it is reviewed.</span>
        </p>
      ) : null}
    </div>
  )
}
