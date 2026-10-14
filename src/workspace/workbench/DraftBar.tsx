import { useEffect } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import type { DraftVersion } from './use-draft-version'

type DraftBarProps = {
  draft: DraftVersion
  latestVersion: number
  /** Whether Save can act on what is on screen, typed-but-uncommitted text included. */
  saveEnabled: boolean
  /** Commits whatever is typed but not yet committed, so Save saves what is on screen. */
  onBeforeSave: () => void
  /** Saves what is on screen. */
  onSave: () => void
}

export function DraftBar({ draft, latestVersion, saveEnabled, onBeforeSave, onSave }: DraftBarProps) {
  const announce = useAnnounce()
  const { savedVersion } = draft
  useEffect(() => {
    if (savedVersion !== undefined) announce(`Saved as v${savedVersion} · posted to the thread.`)
  }, [savedVersion, announce])
  return (
    <div role="group" aria-label="Draft version" className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-ink p-3">
      <span className="text-label uppercase text-ink">{draft.dirty ? 'Draft · not saved' : `Showing v${latestVersion}`}</span>
      <Button disabled={!saveEnabled} onMouseDown={onBeforeSave} onClick={onSave}>{`Save as v${draft.nextVersion}`}</Button>
      <Button rank="secondary" disabled={!draft.dirty || draft.saving} onClick={draft.discard}>Discard</Button>
      {draft.keptFromEarlier ? <p className="text-body text-ink-3">Unsaved draft · kept from when you left this page.</p> : null}
      {draft.saving ? <p role="status" className="text-body text-ink-3">Saving…</p> : null}
      {draft.saveRequested && !draft.saving ? <p role="status" className="text-body text-ink-3">Saving once the preview is ready…</p> : null}
      {draft.previewPending && !draft.previewError && !draft.saveRequested && !draft.saving ? <p role="status" className="text-body text-ink-3">Updating the preview…</p> : null}
      {draft.newerArrived ? <p role="status" className="text-body text-ink-2">{`v${latestVersion} arrived while you were editing; your edits will apply on top of it.`}</p> : null}
      {draft.savedVersion !== undefined ? <p className="text-body text-ink-2">{`Saved as v${draft.savedVersion} · posted to the thread.`}</p> : null}
      {draft.previewError ? <p role="alert" className="text-body">{draft.previewError.message}</p> : null}
      {draft.saveError ? <p role="alert" className="text-body">{draft.saveError.message}</p> : null}
    </div>
  )
}
