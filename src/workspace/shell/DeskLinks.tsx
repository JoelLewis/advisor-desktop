import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Pane } from '@/kit/layout/Pane'

/** Firm surfaces that are not threads. A client is never offered them. */
const DESK: readonly { to: string; label: string }[] = [{ to: '/supervision', label: 'Supervision' }, { to: '/archive', label: 'Archive' }]

/** The firm's reference views, one step from every thread. */
const REFERENCE: readonly { to: string; label: string }[] = [
  { to: '/billing', label: 'Billing' }, { to: '/reconciliation', label: 'Reconciliation' }, { to: '/risk', label: 'Risk' },
  { to: '/models', label: 'Models' }, { to: '/practice', label: 'Practice' }, { to: '/blotter', label: 'Blotter' },
]

export function DeskLinks() {
  return (
    <>
      <LinkPane title="Firm" links={DESK} />
      <LinkPane title="Reports" links={REFERENCE} />
    </>
  )
}

function LinkPane({ title, links }: { title: string; links: readonly { to: string; label: string }[] }) {
  return (
    <Pane title={title}>
      <ul className="flex flex-col">
        {links.map(({ to, label }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => cn('flex border-l-2 py-2 pl-3 pr-2 text-body hover:bg-face', isActive ? 'border-ink bg-face font-semibold' : 'border-transparent')}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </Pane>
  )
}
