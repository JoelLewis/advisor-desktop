import { Page } from '@/kit/page/Page'
import { KitSections } from './kit/KitSections'
import { ThemeToggle } from '@/workspace/shell/ThemeToggle'
import { useKitData } from './kit/use-kit-data'

export function KitPage() {
  const state = useKitData()
  return (
    <Page title="Component kit" eyebrow="Advisor Desktop · instrument" meta={<ThemeToggle />}>
      <div data-kit-ready={state.status === 'ready' ? 'true' : 'false'}>
        {state.status === 'loading' ? <p role="status" className="text-body text-ink-3">Loading the account from the engine…</p> : null}
        {state.status === 'error' ? <p role="alert" className="text-body">The account could not be loaded from the engine.</p> : null}
        {state.status === 'ready' ? <KitSections data={state.data} /> : null}
      </div>
    </Page>
  )
}
