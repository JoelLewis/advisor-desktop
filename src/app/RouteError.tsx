import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Page } from '@/kit/page/Page'
import { useDocumentTitle } from './use-document-title'
import { LINK_TARGET } from '@/kit/link-target'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** A route that threw: say so plainly, offer the way back, and keep the error itself for whoever opens it. */
export function RouteError() {
  useDocumentTitle()
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'
  return (
    <Page title="Something went wrong" eyebrow="Advisor Desktop">
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink-2">This page could not be shown. A reload starts the demo over.</p>
        <a href="/" className={`self-start ${LINK}`}>The workspace</a>
        <details className="text-body text-ink-3">
          <summary className="cursor-pointer">What the app reported</summary>
          <p className="mt-2">{message}</p>
        </details>
      </div>
    </Page>
  )
}
