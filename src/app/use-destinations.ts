import { accountDisplayName } from '@/lib/account-display'
import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAccount } from '@/services/custodian'
import { getHousehold } from '@/services/workspace'
import { useDirectory, useProposals, useThreads } from '@/hooks/use-workspace'
import { useMeetings } from '@/hooks/use-meetings'
import { useProspects } from '@/hooks/use-prospect-work'
import { useReferenceModels } from '@/hooks/use-reference'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import { accountAttributionHref, accountRiskHref, billingHref, blotterHref, bookRiskHref, modelHref, modelsHref, practiceHref, reconciliationHref } from '@/workspace/full-views/reference-href'
import { clientFullViewHref, householdFullViewHref, meetingFullViewHref, prospectFullViewHref } from '@/workspace/full-views/full-view-href'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { threadTitleFor } from '@/workspace/people/roster'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Destination } from '@/kit/keyboard/keys'

const REFERENCE_DESTINATIONS: readonly { id: string; label: string; aliases: string[]; href: () => string }[] = [
  { id: 'billing', label: 'Billing', aliases: ['fees', 'billing runs'], href: () => billingHref() },
  { id: 'reconciliation', label: 'Reconciliation', aliases: ['breaks', 'custodian'], href: () => reconciliationHref() },
  { id: 'risk-book', label: 'Risk · book', aliases: ['risk', 'tolerance'], href: () => bookRiskHref() },
  { id: 'models', label: 'Models', aliases: ['model governance', 'benchmarks'], href: () => modelsHref() },
  { id: 'practice', label: 'Practice', aliases: ['revenue', 'book of business'], href: () => practiceHref() },
  { id: 'blotter', label: 'Blotter', aliases: ['orders', 'trades', 'fills'], href: () => blotterHref() },
]

/**
 * Where the command line can go: home, each thread the viewer can see, and for the firm, the accounts and households
 * those threads are about with the households' clients, each meeting, each prospect, each proposal's workbench, the reference views and each model, the desk and the kit.
 */
export function useDestinations(): Destination[] {
  const navigate = useNavigate()
  const { viewerId } = useViewer()
  const directory = useDirectory().data
  const firmViewer = directory !== undefined && !isExternalViewerIn(directory, viewerId)
  const threads = useThreads().data ?? []
  const proposals = useProposals(undefined, firmViewer).data ?? []
  const meetings = useMeetings(firmViewer).data ?? []
  const prospects = useProspects(firmViewer).data ?? []
  const models = useReferenceModels(firmViewer).data?.models ?? []
  const accountIds = firmViewer ? [...new Set(threads.flatMap((t) => (t.subject?.type === 'account' ? [t.subject.id] : [])))] : []
  const householdIds = firmViewer ? [...new Set(threads.flatMap((t) => (t.subject?.type === 'household' ? [t.subject.id] : [])))] : []
  // Same keys as useAccount and useHousehold, so the full views reuse what the command line already fetched.
  const accounts = useQueries({ queries: accountIds.map((id) => ({ queryKey: ['account', viewerId, id], queryFn: () => getAccount(viewerId, id) })) })
  const households = useQueries({ queries: householdIds.map((id) => ({ queryKey: ['workspace', viewerId, 'household', id], queryFn: () => getHousehold(viewerId, id) })) })

  return [
    { id: 'home', label: 'Workspace home', aliases: ['home'], run: () => navigate('/') },
    // An outsider's conversation is titled for them, as in the list; until the directory says who the viewer is, no thread is offered.
    ...(directory ? threads.map((t) => ({ id: `thread-${t.id}`, label: `Thread · ${threadTitleFor(t, !firmViewer)}`, aliases: [], run: () => navigate(`/t/${t.id}`) })) : []),
    ...accounts.flatMap(({ data }) => (data
      ? [{ id: `account-${data.id}`, label: `Account · ${accountDisplayName(data)}`, aliases: [], run: () => navigate(`/accounts/${data.id}`) }]
      : [])),
    ...households.flatMap(({ data }) => (data ? [
      { id: `household-${data.id}`, label: `Household · ${data.shortName}`, aliases: ['household'], run: () => navigate(householdFullViewHref(data.id)) },
      ...data.members.map((m) => ({ id: `client-${m.clientId}`, label: `Client · ${m.name}`, aliases: ['client'], run: () => navigate(clientFullViewHref(m.clientId)) })),
    ] : [])),
    ...meetings.map((m) => ({ id: `meeting-${m.eventId}`, label: `Meeting · ${m.title}`, aliases: ['meeting', 'review'], run: () => navigate(meetingFullViewHref(m.eventId, m.threadId)) })),
    ...prospects.map((p) => ({ id: `prospect-${p.id}`, label: `Prospect · ${p.name}`, aliases: ['prospect'], run: () => navigate(prospectFullViewHref(p.id)) })),
    ...proposals.map((p) => ({ id: `proposal-${p.id}`, label: `Proposal · ${p.title}`, aliases: ['workbench'], run: () => navigate(proposalWorkbenchHref(p.id, p.threadId)) })),
    ...(firmViewer ? REFERENCE_DESTINATIONS.map((r) => ({ id: r.id, label: r.label, aliases: r.aliases, run: () => navigate(r.href()) })) : []),
    ...(firmViewer ? accounts.flatMap(({ data }) => (data ? [
      { id: `risk-${data.id}`, label: `Risk · ${accountDisplayName(data)}`, aliases: ['risk'], run: () => navigate(accountRiskHref(data.id)) },
      { id: `attribution-${data.id}`, label: `Attribution · ${accountDisplayName(data)}`, aliases: ['attribution', 'performance'], run: () => navigate(accountAttributionHref(data.id)) },
    ] : [])) : []),
    ...models.map((m) => ({ id: `model-${m.id}`, label: `Model · ${m.name}`, aliases: ['model'], run: () => navigate(modelHref(m.id)) })),
    ...(firmViewer ? [{ id: 'supervision', label: 'Supervision', aliases: ['queue', 'compliance'], run: () => navigate('/supervision') }] : []),
    ...(firmViewer ? [{ id: 'archive', label: 'Archive', aliases: ['records', 'books and records'], run: () => navigate('/archive') }] : []),
    ...(firmViewer ? [{ id: 'kit', label: 'Component kit', aliases: ['kit', 'components', 'gallery'], run: () => navigate('/kit') }] : []),
  ]
}
