import { Link, useParams } from 'react-router-dom'
import { blotterHref } from '@/workspace/full-views/reference-href'

/** The account's orders on the blotter, opened from the thread on screen. */
export function BlotterLink({ accountId }: { accountId: string }) {
  const { threadId } = useParams()
  return (
    <Link to={blotterHref({ accountId }, threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
      Open in the blotter
    </Link>
  )
}
