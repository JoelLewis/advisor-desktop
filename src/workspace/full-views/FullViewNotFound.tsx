import { Link } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'

/** What a full view says when its subject does not exist or this viewer may not see it; the engine does not distinguish. */
export function FullViewNotFound({ subject, resetsOnReload = false }: { subject: string; resetsOnReload?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{`${subject} not found`}</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      {resetsOnReload ? (
        <>
          <p className="text-body text-ink-2">This demo&apos;s state resets when the page reloads.</p>
          <Link to="/t/th-brief" className="self-start text-body underline underline-offset-4">Start again from the Brief</Link>
        </>
      ) : <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>}
    </div>
  )
}
