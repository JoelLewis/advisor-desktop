import { useId, useRef, useState } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { useDraftLetter, useDrafts, useProposals } from '@/hooks/use-workspace'
import type { Draft, Thread } from '@/types/workspace'
import type { ProposalDetail } from '@/types/workspace-proposal'
import { Unbroken } from '@/kit/unbroken/Unbroken'

type Asked = { draftId: string; version: number; title: string; created: boolean }

/** Asks the Client Letter Agent for a letter from this client's approved proposal. */
export function LetterControl({ thread }: { thread: Thread }) {
  const announce = useAnnounce()
  const reasonId = useId()
  const proposals = useProposals()
  const letter = useDraftLetter(thread.id)
  const drafts = useDrafts(thread.id, true)
  const [asked, setAsked] = useState<Asked>()
  const asking = useRef(false)
  if (proposals.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposals…</p>
  if (proposals.isError) return <p role="alert" className="text-body">{proposals.error.message}</p>
  const forClient = proposals.data.filter((p) => p.clientId === thread.partyId)
  const approved = forClient.flatMap((p) => (p.approval.kind === 'approved' ? [{ p, version: p.approval.version }] : []))
  if (approved.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button rank="secondary" disabled aria-describedby={reasonId}>Ask Client Letter Agent</Button>
        <span id={reasonId} className="text-label text-ink-3"><Unbroken text={noLetterReason(forClient)} /></span>
      </div>
    )
  }
  // A ref, not render state, so a double-click cannot send a second request before the first settles.
  const ask = (proposalId: string, title: string) => {
    if (asking.current) return
    asking.current = true
    const held = new Set((drafts.data ?? []).map((d) => d.id))
    setAsked(undefined)
    letter.mutate(proposalId, {
      onSuccess: (draft: Draft) => {
        const next = draft.basis ? { draftId: draft.id, version: draft.basis.version, title, created: !held.has(draft.id) } : undefined
        setAsked(next)
        if (next) announce(letterReport(next))
      },
      onSettled: () => { asking.current = false },
    })
  }
  // The report stands only while the draft it names is still held: it clears once that draft is sent or replaced.
  const reported = asked && drafts.data?.some((d) => d.id === asked.draftId) ? asked : undefined
  const report = reported ? letterReport(reported) : undefined
  return (
    <div className="flex flex-col items-start gap-2">
      {approved.map(({ p, version }) => (
        <div key={p.id} className="flex flex-col items-start gap-1">
          <Button rank="secondary" pending={letter.isPending} onClick={() => ask(p.id, p.title)}>
            Ask Client Letter Agent
          </Button>
          <span className="text-label text-ink-3">{`From v${version} of the ${p.title}, approved`}</span>
        </div>
      ))}
      {letter.isError ? <p role="alert" className="text-body">{letter.error.message}</p> : null}
      {report ? <p className="text-body text-ink-2">{report}</p> : null}
    </div>
  )
}

const letterReport = (asked: Asked) => asked.created
  ? `The Client Letter Agent drafted a letter from v${asked.version} of the ${asked.title}.`
  : `The Client Letter Agent's letter from v${asked.version} of the ${asked.title} is already in the drafts.`

/**
 * Why there is nothing to write from. A letter explains an approved version before its orders are placed:
 * a proposal still to approve comes first; otherwise, once the latest approval's orders are filled, no approval is waiting for one.
 */
function noLetterReason(forClient: readonly ProposalDetail[]): string {
  const toApprove = forClient.some((p) => p.approval.kind === 'unapproved')
  const filled = forClient.flatMap((p) => (p.approval.kind === 'released' ? [{ title: p.title, ...p.approval }] : [])).pop()
  return filled && !toApprove ? `The orders from v${filled.version} of the ${filled.title} were filled (${filled.releaseActId}); no approved proposal awaits a letter.`
    : 'Approve a proposal first.'
}
