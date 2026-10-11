import { useId, type ReactNode } from 'react'

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-6">{children}</div>
}

export function MainColumn({ children }: { children: ReactNode }) {
  return <div className="col-span-12 flex min-w-0 flex-col gap-8 split:col-span-8">{children}</div>
}

export function SidePanel({ label, children }: { label: string; children: ReactNode }) {
  const labelId = useId()
  return (
    <aside aria-labelledby={labelId} className="col-span-12 flex min-w-0 flex-col gap-4 split:col-span-4">
      <span id={labelId} className="border-b border-ink pb-2 text-label uppercase text-ink-2">{label}</span>
      {children}
    </aside>
  )
}
