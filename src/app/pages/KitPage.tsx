import { Page } from '@/kit/page/Page'
import { KitSections } from './kit/KitSections'
import { ThemeToggle } from './kit/ThemeToggle'
import { useKitData } from './kit/use-kit-data'

export function KitPage() {
  const state = useKitData()
  return (
    <Page title="Component kit" eyebrow="Advisor Desktop · instrument" meta={<ThemeToggle />}>
      <div data-kit-ready={state.status === 'ready' ? 'true' : 'false'}>
        {state.status === 'loading' ? <p role="status" className="text-body text-ink-3">Loading acc-002 from the engine…</p> : null}
        {state.status === 'error' ? <p role="alert" className="text-body">{state.error.message}</p> : null}
        {state.status === 'ready' ? <KitSections data={state.data} /> : null}
      </div>
    </Page>
  )
}
