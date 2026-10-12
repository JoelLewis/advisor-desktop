import type { ReactNode } from 'react'

type PaneProps = {
  title: string
  meta?: ReactNode
  /** Given, the pane is a region named by its title. */
  titleId?: string
  children: ReactNode
}

export function Pane({ title, meta, titleId, children }: PaneProps) {
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{title}</h2>
        {meta ? <span className="text-label text-ink-3">{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}
