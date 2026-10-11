import type { ReactNode } from 'react'
import { MAIN_ID, PAGE_TITLE_ID } from './ids'

type PageProps = { title: string; eyebrow?: string; meta?: ReactNode; children: ReactNode }

export function Page({ title, eyebrow, meta, children }: PageProps) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <a href={`#${MAIN_ID}`} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-face focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-4 border-b border-ink px-6 pb-4 pt-8">
        <div className="flex flex-col gap-1">
          {eyebrow ? <span className="text-label uppercase text-ink-3">{eyebrow}</span> : null}
          <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{title}</h1>
        </div>
        {meta ? <div className="text-body text-ink-2">{meta}</div> : null}
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto max-w-[1440px] px-6 py-8">{children}</main>
    </div>
  )
}
