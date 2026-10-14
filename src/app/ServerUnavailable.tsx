import { Page } from '@/kit/page/Page'

/** What the page shows when the demo's in-browser server (an MSW service worker) could not start: never a blank page. */
export function ServerUnavailable({ reason }: { reason: string }) {
  return (
    <Page title="The demo could not start" eyebrow="Advisor Desktop">
      <div className="flex max-w-prose flex-col gap-3">
        <p className="text-body">
          This demo runs its server in your browser as a service worker, and this browser did not let it start.
          Private windows and locked-down browser profiles often block service workers.
        </p>
        <p className="text-body">Try a regular window in Chrome, Edge, Safari or Firefox.</p>
        <p className="text-body text-ink-3">The browser said: {reason}</p>
      </div>
    </Page>
  )
}
