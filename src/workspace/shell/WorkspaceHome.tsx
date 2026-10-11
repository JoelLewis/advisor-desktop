import { PAGE_TITLE_ID } from '@/kit/page/ids'

export function WorkspaceHome() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Workspace</h1>
      <p className="text-body text-ink-2">Choose a thread.</p>
    </div>
  )
}
