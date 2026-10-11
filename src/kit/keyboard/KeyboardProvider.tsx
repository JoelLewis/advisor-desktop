import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { KeyboardContext } from './keyboard-context'
import { isEditableTarget, type Binding, type Destination } from './keys'
import { CommandLine } from './CommandLine'
import { KeySheet } from './KeySheet'

const OPEN_DIALOG = '[role="dialog"][data-state="open"]'
const RESERVED = ['/', '?']

type Registration = { scope: string; bindings: Binding[] }

function warnOnCollisions(token: string, { scope, bindings }: Registration, existing: Map<string, Registration>) {
  for (const { key } of bindings) {
    if (RESERVED.includes(key)) { console.warn(`Jump key "${key}" in scope "${scope}" collides with the reserved keys.`); continue }
    const owner = [...existing].find(([t, r]) => t !== token && r.bindings.some((b) => b.key === key))?.[1]
    if (owner) console.warn(`Jump key "${key}" in scope "${scope}" collides with scope "${owner.scope}".`)
  }
}

export function KeyboardProvider({ destinations, children }: { destinations: Destination[]; children: ReactNode }) {
  const [registrations, setRegistrations] = useState<Map<string, Registration>>(new Map())
  const registrationsRef = useRef<Map<string, Registration>>(new Map())
  const order = useRef<Map<string, number>>(new Map())
  const nextOrder = useRef(0)
  const [commandOpen, setCommandOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const commit = useCallback(() => setRegistrations(new Map(registrationsRef.current)), [])

  const register = useCallback((token: string, scope: string, bindings: Binding[]) => {
    if (!order.current.has(token)) order.current.set(token, nextOrder.current++)
    const registration = { scope, bindings }
    if (import.meta.env.DEV) warnOnCollisions(token, registration, registrationsRef.current)
    registrationsRef.current.set(token, registration)
    commit()
    return () => { registrationsRef.current.delete(token); commit() }
  }, [commit])

  // Pruned after the commit rather than in the unregister cleanup, so a registration that only
  // re-registers (its bindings changed) keeps its place in the legend.
  useEffect(() => {
    for (const token of order.current.keys()) if (!registrationsRef.current.has(token)) order.current.delete(token)
  }, [registrations])

  const orderSize = useCallback(() => order.current.size, [])

  const bindings = useMemo(
    () => [...registrations.entries()]
      .sort(([a], [b]) => (order.current.get(a) ?? 0) - (order.current.get(b) ?? 0))
      .flatMap(([, r]) => r.bindings),
    [registrations],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing) return
      if (e.ctrlKey || e.metaKey || e.altKey || isEditableTarget(e.target)) return
      if (commandOpen || sheetOpen || document.querySelector(OPEN_DIALOG)) return
      if (e.key === '/') { e.preventDefault(); setCommandOpen(true); return }
      if (e.key === '?') { e.preventDefault(); setSheetOpen(true); return }
      const match = bindings.find((b) => b.key === e.key)
      if (match) { e.preventDefault(); match.run() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings, commandOpen, sheetOpen])

  const value = useMemo(() => ({ register, bindings, orderSize }), [register, bindings, orderSize])

  return (
    <KeyboardContext.Provider value={value}>
      {children}
      <CommandLine open={commandOpen} onOpenChange={setCommandOpen} destinations={destinations} />
      <KeySheet open={sheetOpen} onOpenChange={setSheetOpen} bindings={bindings} />
    </KeyboardContext.Provider>
  )
}
