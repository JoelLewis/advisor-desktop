import type { ReactNode } from 'react'

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-6">{children}</div>
}

export function MainColumn({ children }: { children: ReactNode }) {
  return <div className="col-span-12 flex min-w-0 flex-col gap-8 min-[1100px]:col-span-8">{children}</div>
}

export function SidePanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside aria-label={label} className="col-span-12 flex min-w-0 flex-col gap-4 min-[1100px]:col-span-4">
      <span className="border-b border-ink pb-2 text-label uppercase text-ink-2">{label}</span>
      {children}
    </aside>
  )
}
