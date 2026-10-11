import { Link } from 'react-router-dom'
import { Page } from '@/kit/page/Page'

export function NotFoundPage() {
  return (
    <Page title="Page not found" eyebrow="Workspace">
      <Link to="/" className="text-body underline underline-offset-4">Go to the workspace</Link>
    </Page>
  )
}
