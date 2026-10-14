import { useState } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { useCreateProspectProposal } from '@/hooks/use-prospect-work'
import type { AgentProfile } from '@/types/workspace'

/** Asks the Proposal Agent for her proposal; the engine returns the existing one rather than drafting twice. */
export function ProspectAgentControl({ prospectId, agent }: { prospectId: string; agent: AgentProfile }) {
  const announce = useAnnounce()
  const create = useCreateProspectProposal(prospectId)
  const [report, setReport] = useState<string>()
  const ask = () => {
    setReport(undefined)
    create.mutate(undefined, {
      onSuccess: (detail) => {
        const said = detail.versions.length === 1 ? `${agent.name} posted v1 in the thread.` : `${agent.name} has already drafted this proposal; v${detail.versions.length} is in the thread.`
        setReport(said)
        announce(said)
      },
    })
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <Button rank="secondary" disabled={create.isPending} onClick={ask}>{`Ask ${agent.name}`}</Button>
      {create.isError ? <p role="alert" className="text-body">{create.error.message}</p> : null}
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
    </div>
  )
}
