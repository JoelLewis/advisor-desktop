import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAccount } from '@/services/custodian'
import { getHousehold } from '@/services/workspace'
import { useDirectory, useProposals, useThreads } from '@/hooks/use-workspace'
import { useMeetings } from '@/hooks/use-meetings'
import { useProspects } from '@/hooks/use-prospect-work'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import { clientFullViewHref, householdFullViewHref, meetingFullViewHref, prospectFullViewHref } from '@/workspace/full-views/full-view-href'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Destination } from '@/kit/keyboard/keys'

/**
 * Where the command line can go: home, each thread the viewer can see, the accounts those threads are about, and for
 * the firm, the households they are about with their clients, each meeting, each prospect, each proposal's workbench, the desk and the kit.
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
  const accountIds = [...new Set(threads.flatMap((t) => (t.subject?.type === 'account' ? [t.subject.id] : [])))]
  const householdIds = firmViewer ? [...new Set(threads.flatMap((t) => (t.subject?.type === 'household' ? [t.subject.id] : [])))] : []
  // Same keys as useAccount and useHousehold, so the full views reuse what the command line already fetched.
  const accounts = useQueries({ queries: accountIds.map((id) => ({ queryKey: ['account', id], queryFn: () => getAccount(id) })) })
  const households = useQueries({ queries: householdIds.map((id) => ({ queryKey: ['workspace', viewerId, 'household', id], queryFn: () => getHousehold(viewerId, id) })) })

  return [
    { id: 'home', label: 'Workspace home', aliases: ['home'], run: () => navigate('/') },
    ...threads.map((t) => ({ id: `thread-${t.id}`, label: `Thread · ${t.title}`, aliases: [], run: () => navigate(`/t/${t.id}`) })),
    ...accounts.flatMap(({ data }) => (data
      ? [{ id: `account-${data.id}`, label: `Account · ${data.name}`, aliases: [], run: () => navigate(`/accounts/${data.id}`) }]
      : [])),
    ...households.flatMap(({ data }) => (data ? [
      { id: `household-${data.id}`, label: `Household · ${data.shortName}`, aliases: ['household'], run: () => navigate(householdFullViewHref(data.id)) },
      ...data.members.map((m) => ({ id: `client-${m.clientId}`, label: `Client · ${m.name}`, aliases: ['client'], run: () => navigate(clientFullViewHref(m.clientId)) })),
    ] : [])),
    ...meetings.map((m) => ({ id: `meeting-${m.eventId}`, label: `Meeting · ${m.title}`, aliases: ['meeting', 'review'], run: () => navigate(meetingFullViewHref(m.eventId, m.threadId)) })),
    ...prospects.map((p) => ({ id: `prospect-${p.id}`, label: `Prospect · ${p.name}`, aliases: ['prospect'], run: () => navigate(prospectFullViewHref(p.id)) })),
    ...proposals.map((p) => ({ id: `proposal-${p.id}`, label: `Proposal · ${p.title}`, aliases: ['workbench'], run: () => navigate(proposalWorkbenchHref(p.id, p.threadId)) })),
    ...(firmViewer ? [{ id: 'supervision', label: 'Supervision', aliases: ['queue', 'compliance'], run: () => navigate('/supervision') }] : []),
    ...(firmViewer ? [{ id: 'archive', label: 'Archive', aliases: ['records', 'books and records'], run: () => navigate('/archive') }] : []),
    ...(firmViewer ? [{ id: 'kit', label: 'Component kit', aliases: ['kit', 'components', 'gallery'], run: () => navigate('/kit') }] : []),
  ]
}
