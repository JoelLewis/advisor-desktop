import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { teamWords } from '@/workspace/people/visibility-words'
import type { MethodNote } from '@/types/reference'
import { MethodsAndSources } from './MethodsAndSources'
import { LINK_TARGET } from '@/kit/link-target'

type ReferencePageProps = { title: string; from: string | null; lead?: ReactNode; methods: readonly MethodNote[]; children: ReactNode }

/** Every reference view: the way back to its thread, the firm-only band, one title, its readings, and how they were made. */
export function ReferencePage({ title, from, lead, methods, children }: ReferencePageProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={`${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" words={teamWords([])} />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{title}</h1>
        {lead}
      </header>
      {children}
      <MethodsAndSources notes={methods} />
    </div>
  )
}
