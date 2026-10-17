import { Page } from '@/kit/page/Page'
import { KeyLegend } from '@/kit/keyboard/KeyLegend'
import { KitSections } from './kit/KitSections'
import { ThemeToggle } from '@/workspace/shell/ThemeToggle'
import { useKitData } from './kit/use-kit-data'

export function KitPage() {
  const state = useKitData()
  return (
    <>
      <Page title="Component kit" eyebrow="Advisor Desktop · instrument" meta={<ThemeToggle />}>
        <div data-kit-ready={state.status === 'ready' ? 'true' : 'false'}>
          {state.status === 'loading' ? <p role="status" className="text-body text-ink-3">Loading the account…</p> : null}
          {state.status === 'error' ? <p role="alert" className="text-body">{state.error.message}</p> : null}
          {state.status === 'ready' ? <KitSections data={state.data} /> : null}
        </div>
      </Page>
      <footer className="mx-auto w-full max-w-(--breakpoint-wide) border-t border-rule px-6 py-3">
        <KeyLegend />
      </footer>
    </>
  )
}
