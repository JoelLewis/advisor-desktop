import { Button } from '@/kit/button/Button'
import type { DraftVersion } from './use-draft-version'

export function DraftBar({ draft, latestVersion }: { draft: DraftVersion; latestVersion: number }) {
  return (
    <div role="group" aria-label="Draft version" className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-ink p-3">
      <span className="text-label uppercase text-ink">{draft.dirty ? 'Draft · not saved' : `Showing v${latestVersion}`}</span>
      <Button disabled={!draft.canSave} onClick={draft.save}>{`Save as v${draft.nextVersion}`}</Button>
      <Button rank="secondary" disabled={!draft.dirty || draft.saving} onClick={draft.discard}>Discard</Button>
      {draft.keptFromEarlier ? <p className="text-body text-ink-3">Unsaved draft · kept from when you left this page.</p> : null}
      {draft.previewPending && !draft.previewError ? <p role="status" className="text-body text-ink-3">Updating the preview…</p> : null}
      {draft.newerArrived ? <p role="status" className="text-body text-ink-2">{`v${latestVersion} arrived while you were editing; your edits will apply on top of it.`}</p> : null}
      {draft.savedVersion !== undefined ? <p role="status" className="text-body text-ink-2">{`Saved as v${draft.savedVersion} · posted to the thread.`}</p> : null}
      {draft.previewError ? <p role="alert" className="text-body">{draft.previewError.message}</p> : null}
      {draft.saveError ? <p role="alert" className="text-body">{draft.saveError.message}</p> : null}
    </div>
  )
}
