import { Page } from '@/kit/page/Page'
import type { StartStage } from './start-failure'
import { useDocumentTitle } from './use-document-title'

/**
 * What the page shows when the demo could not start: its in-browser server (an MSW service worker) did not start,
 * or its code did not finish loading. Never a blank page, and never the static header left standing.
 */
export function ServerUnavailable({ stage, reason }: { stage: StartStage; reason: string }) {
  useDocumentTitle()
  return (
    <Page title="The demo could not start" eyebrow="Advisor Desktop">
      <div className="flex max-w-prose flex-col gap-3">
        {stage === 'server' ? (
          <>
            <p className="text-body">
              This demo runs its server in your browser as a service worker, and this browser did not let it start.
              Private windows and locked-down browser profiles often block service workers.
            </p>
            <p className="text-body">Try a regular window in Chrome, Edge, Safari or Firefox.</p>
          </>
        ) : (
          <>
            <p className="text-body">The demo&apos;s code did not finish loading, so the workspace cannot open.</p>
            <p className="text-body">Reload the page. If it fails again, the network or a browser extension may be blocking the download.</p>
          </>
        )}
        <p className="text-body text-ink-3">The browser said: {reason}</p>
      </div>
    </Page>
  )
}
