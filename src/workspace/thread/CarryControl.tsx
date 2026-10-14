import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { useAccount } from '@/hooks/use-accounts'
import { useCarryFinding, useThreads } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Thread } from '@/types/workspace'
import { carryTargets } from './carry-targets'

type Move = 1 | -1 | 'first' | 'last'
const MOVES = new Map<string, Move>([['ArrowDown', 1], ['ArrowUp', -1], ['Home', 'first'], ['End', 'last']])

/** "Take to ▾": the brief's owner sends a finding to the team thread about its subject, or to its household's meeting thread. */
export function CarryControl({ thread, findingId }: { thread: Thread; findingId: string }) {
  const announce = useAnnounce()
  const { viewerId } = useViewer()
  const threads = useThreads()
  const carry = useCarryFinding(thread.id)
  const [open, setOpen] = useState(false)
  const [pendingFocus, setPendingFocus] = useState<'first' | 'last'>()
  const [taken, setTaken] = useState<string>()
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const toggleId = useId()
  const menuId = useId()
  const subject = thread.subject
  const account = useAccount(subject?.type === 'account' ? subject.id : '')
  const targets = carryTargets(threads.data ?? [], viewerId, subject, account.data?.householdId)

  // A press outside the control closes the menu; the listener lives only while the menu is open.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keyboard opening focuses an item once the list is in the DOM.
  useEffect(() => {
    if (!open || pendingFocus === undefined) return
    focusItem(pendingFocus)
    setPendingFocus(undefined)
  }, [open, pendingFocus])

  // The team thread is offered at once; the household's meeting thread joins it once the account's household arrives.
  if (thread.ownerId !== viewerId || targets.length === 0) return null

  function focusItem(move: Move) {
    const all = Array.from(menuRef.current?.querySelectorAll('button') ?? [])
    if (all.length === 0) return
    const current = all.indexOf(document.activeElement as HTMLButtonElement)
    const next = move === 'first' ? 0 : move === 'last' ? all.length - 1 : (current + move + all.length) % all.length
    all[next]?.focus()
  }
  const close = () => { setOpen(false); document.getElementById(toggleId)?.focus() }
  const onToggleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const edge = e.key === 'ArrowDown' ? 'first' : 'last'
    if (open) focusItem(edge)
    else { setOpen(true); setPendingFocus(edge) }
  }
  const onMenuKeyDown = (e: KeyboardEvent) => {
    const move = MOVES.get(e.key)
    if (move === undefined) return
    e.preventDefault()
    focusItem(move)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); close() }
  }
  const onBlur = (e: FocusEvent) => {
    // A null relatedTarget (Safari does not focus a button on mousedown) is left to the outside-press handler.
    if (open && e.relatedTarget instanceof Node && !containerRef.current?.contains(e.relatedTarget)) setOpen(false)
  }
  return (
    <div ref={containerRef} className="flex flex-col items-start gap-2" onKeyDown={onKeyDown} onBlur={onBlur}>
      <Button id={toggleId} rank="secondary" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((o) => !o)} onKeyDown={onToggleKeyDown}>
        Take to <span aria-hidden="true">▾</span>
      </Button>
      {open ? (
        <ul ref={menuRef} id={menuId} role="menu" aria-label="Take to" onKeyDown={onMenuKeyDown} className="m-0 flex list-none flex-col items-start gap-1 border-l border-rule-2 p-0 pl-3">
          {targets.map((target) => (
            <li key={target.id} role="none">
              <Button role="menuitem" rank="quiet" disabled={carry.isPending}
                onClick={() => carry.mutate({ messageId: findingId, toThreadId: target.id }, { onSuccess: () => { setTaken(target.title); announce(`Taken to ${target.title}.`); close() } })}>
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
