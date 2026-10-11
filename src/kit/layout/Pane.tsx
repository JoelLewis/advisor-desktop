import type { ReactNode } from 'react'

export function Pane({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
        <h2 className="text-label uppercase text-ink-2">{title}</h2>
        {meta ? <span className="text-label text-ink-3">{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}
