import { Link } from 'react-router-dom'
import { useAccount } from '@/hooks/use-accounts'
import { accountFullViewHref } from '@/workspace/full-views/full-view-href'
import { ContextSection } from './ContextSection'

export function FullViews({ accountId, threadId }: { accountId: string; threadId: string }) {
  const account = useAccount(accountId)
  return (
    <ContextSection title="Full views">
      {account.isPending ? <p role="status" className="text-body text-ink-3">Loading the account…</p>
        : account.isError ? <p role="alert" className="text-body">{account.error.message}</p>
        : (
          <Link to={accountFullViewHref(accountId, threadId)}
            className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
            {`${account.data.name} `}<span aria-hidden="true">↗</span>
          </Link>
        )}
    </ContextSection>
  )
}
