import { Link } from 'react-router-dom'
import { Page } from '@/kit/page/Page'
import { LINK_TARGET } from '@/kit/link-target'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** Any path the router does not hold. The demo has two places to begin: the workspace and the advisor's Brief. */
export function NotFoundPage() {
  return (
    <Page title="Page not found" eyebrow="Advisor Desktop">
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink-2">There is no page at this address. Start from one of these:</p>
        <ul aria-label="Starting points" className="flex flex-col gap-1">
          <li><Link to="/" className={LINK}>The workspace</Link></li>
          <li><Link to="/t/th-brief" className={LINK}>The Brief</Link></li>
        </ul>
      </div>
    </Page>
  )
}
