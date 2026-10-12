import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDirectory, useProposal } from '@/hooks/use-workspace'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { DriftBeforeAfter } from '@/workspace/proposal/DriftBeforeAfter'
import { PretradeNotes } from '@/workspace/proposal/PretradeNotes'
import { ProposalLegsTable } from '@/workspace/proposal/ProposalLegsTable'
import { RestrictionList } from '@/workspace/proposal/RestrictionList'
import { TaxReadings } from '@/workspace/proposal/TaxReadings'
import { authorName } from '@/workspace/proposal/author-name'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import { taxScope } from '@/workspace/proposal/tax-scope'
import type { Directory } from '@/types/workspace'
import type { ProposalVersion } from '@/types/workspace-proposal'

/** The agent that drafts versions already heads the embed; only a person's version names its author. */
const versionByline = (version: ProposalVersion, directory: Directory) =>
  version.author.kind === 'person' ? `v${version.n} · ${authorName(version.author, directory)}` : `v${version.n}`

type ProposalEmbedProps = { proposalId: string; threadId: string; actions?: ReactNode }

/** The proposal as the thread shows it: always its latest version. */
export function ProposalEmbed({ proposalId, threadId, actions }: ProposalEmbedProps) {
  const titleId = useId()
  const proposal = useProposal(proposalId)
  const directory = useDirectory()
  if (proposal.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposal…</p>
  if (proposal.isError) return <p role="alert" className="text-body">{proposal.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const p = proposal.data
  const latest = latestVersionOf(p)
  const currency = latest.preview.currency
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4 border border-rule-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{`Proposal · ${p.title}`}</h2>
        <span className="tabular text-label text-ink-3">{versionByline(latest, directory.data)}</span>
      </div>
      <p className="text-copy">{latest.changeSummary}</p>
      <ApprovalNote state={p.approval} />
      <ProposalLegsTable version={latest} caption={`Proposal legs · v${latest.n}`} />
      <div className="flex flex-col gap-2">
        <TaxReadings summary={latest.summary} currency={currency} />
        <p className="text-label normal-case text-ink-3">{taxScope(latest.preview)}</p>
      </div>
      <RestrictionList restrictions={latest.preview.repurchaseRestrictions} />
      <DriftBeforeAfter accountId={p.accountId} projected={latest.preview.projectedDrift} />
      <PretradeNotes pretrade={latest.pretrade} />
      <div className="flex flex-wrap items-center gap-4">
        <Link to={proposalWorkbenchHref(p.id, threadId)} className="text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
          Workbench <span aria-hidden="true">↗</span>
        </Link>
        {actions}
      </div>
    </section>
  )
}
