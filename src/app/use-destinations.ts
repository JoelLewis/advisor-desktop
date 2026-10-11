import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAccount } from '@/services/custodian'
import { useDirectory, useThreads } from '@/hooks/use-workspace'
import { isClientViewer } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Destination } from '@/kit/keyboard/keys'

/** Where the command line can go: home, each thread the viewer can see, the accounts those threads are about, and (for the firm) the kit. */
export function useDestinations(): Destination[] {
  const navigate = useNavigate()
  const { viewerId } = useViewer()
  const directory = useDirectory().data
  const firmViewer = directory !== undefined && !isClientViewer(directory, viewerId)
  const threads = useThreads().data ?? []
  const accountIds = [...new Set(threads.flatMap((t) => (t.subject?.type === 'account' ? [t.subject.id] : [])))]
  // Same key as useAccount, so the account view reuses what the command line already fetched.
  const accounts = useQueries({ queries: accountIds.map((id) => ({ queryKey: ['account', id], queryFn: () => getAccount(id) })) })

  return [
    { id: 'home', label: 'Workspace home', aliases: ['home'], run: () => navigate('/') },
    ...threads.map((t) => ({ id: `thread-${t.id}`, label: `Thread · ${t.title}`, aliases: [], run: () => navigate(`/t/${t.id}`) })),
    ...accounts.flatMap(({ data }) => (data
      ? [{ id: `account-${data.id}`, label: `Account · ${data.name}`, aliases: [], run: () => navigate(`/accounts/${data.id}`) }]
      : [])),
    ...(firmViewer ? [{ id: 'kit', label: 'Component kit', aliases: ['kit', 'components', 'gallery'], run: () => navigate('/kit') }] : []),
  ]
}
