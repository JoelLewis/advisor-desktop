import { Link, useParams } from 'react-router-dom'
import { blotterHref } from '@/workspace/full-views/reference-href'
import { LINK_TARGET } from '@/kit/link-target'

/** The account's orders on the blotter, opened from the thread on screen. */
export function BlotterLink({ accountId }: { accountId: string }) {
  const { threadId } = useParams()
  return (
    <Link to={blotterHref({ accountId }, threadId)} className={`${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>
      Open in the blotter
    </Link>
  )
}
