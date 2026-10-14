import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/kit/button/Button'
import { useAccount } from '@/hooks/use-accounts'
import { useCarryFinding, useThreads } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Thread } from '@/types/workspace'
import { carryTargets } from './carry-targets'

/** "Take to ▾": the brief's owner sends a finding to the team thread about its subject, or to its household's meeting thread. */
export function CarryControl({ thread, findingId }: { thread: Thread; findingId: string }) {
  const { viewerId } = useViewer()
  const threads = useThreads()
  const carry = useCarryFinding(thread.id)
  const [open, setOpen] = useState(false)
  const [taken, setTaken] = useState<string>()
  const menuRef = useRef<HTMLUListElement>(null)
  const toggleId = useId()
  const menuId = useId()
  const subject = thread.subject
  const account = useAccount(subject?.type === 'account' ? subject.id : '')
  const targets = carryTargets(threads.data ?? [], viewerId, subject, account.data?.householdId)
  // The team thread is offered at once; the household's meeting thread joins it once the account's household arrives.
  if (thread.ownerId !== viewerId || targets.length === 0) return null
  const items = () => Array.from(menuRef.current?.querySelectorAll('button') ?? [])
  const close = () => { setOpen(false); document.getElementById(toggleId)?.focus() }
  const focusItem = (step: 1 | -1 | 'first' | 'last') => {
    const all = items()
    if (all.length === 0) return
    const current = all.indexOf(document.activeElement as HTMLButtonElement)
    const next = step === 'first' ? 0 : step === 'last' ? all.length - 1 : (current + step + all.length) % all.length
    all[next]?.focus()
  }
  const onToggleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    if (open) return focusItem(e.key === 'ArrowDown' ? 'first' : 'last')
    setOpen(true)
    requestAnimationFrame(() => focusItem(e.key === 'ArrowDown' ? 'first' : 'last'))
  }
  const onMenuKeyDown = (e: KeyboardEvent) => {
    const moves = { ArrowDown: 1, ArrowUp: -1, Home: 'first', End: 'last' } as const
    if (e.key in moves) { e.preventDefault(); focusItem(moves[e.key as keyof typeof moves]) }
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); close() }
  }
  return (
    <div className="flex flex-col items-start gap-2" onKeyDown={onKeyDown}>
      <Button id={toggleId} rank="secondary" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((o) => !o)} onKeyDown={onToggleKeyDown}>
        Take to <span aria-hidden="true">▾</span>
      </Button>
      {open ? (
        <ul ref={menuRef} id={menuId} aria-label="Take to" onKeyDown={onMenuKeyDown} className="m-0 flex list-none flex-col items-start gap-1 border-l border-rule-2 p-0 pl-3">
          {targets.map(({ thread: target }) => (
            <li key={target.id}>
              <Button rank="quiet" disabled={carry.isPending}
                onClick={() => carry.mutate({ messageId: findingId, toThreadId: target.id }, { onSuccess: () => { setTaken(target.title); close() } })}>
                {target.title}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {taken ? <p role="status" className="text-body text-ink-2">{`Taken to ${taken}.`}</p> : null}
      {carry.isError ? <p role="alert" className="text-body">{carry.error.message}</p> : null}
    </div>
  )
}
