import { useId, type ReactNode } from 'react'

export function ContextSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <h2 id={titleId} className="text-label uppercase text-ink-2">{title}</h2>
      {children}
    </section>
  )
}
