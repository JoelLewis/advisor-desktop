import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { KeyboardContext } from './keyboard-context'
import { isEditableTarget, type Binding, type Destination } from './keys'
import { CommandLine } from './CommandLine'
import { KeySheet } from './KeySheet'

const OPEN_DIALOG = '[role="dialog"][data-state="open"], [role="dialog"][aria-modal="true"]'
const RESERVED = ['/', '?']

function warnOnCollisions(scope: string, bindings: Binding[], existing: Map<string, Binding[]>) {
  for (const { key } of bindings) {
    const owner = RESERVED.includes(key) ? 'the reserved keys' : [...existing].find(([s, list]) => s !== scope && list.some((b) => b.key === key))?.[0]
    if (owner) console.warn(`Jump key "${key}" in scope "${scope}" collides with ${RESERVED.includes(key) ? owner : `scope "${owner}"`}.`)
  }
}

export function KeyboardProvider({ destinations, children }: { destinations: Destination[]; children: ReactNode }) {
  const [scopes, setScopes] = useState<Map<string, Binding[]>>(new Map())
  const scopesRef = useRef<Map<string, Binding[]>>(new Map())
  const scopeOrder = useRef<Map<string, number>>(new Map())
  const [commandOpen, setCommandOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const commit = useCallback(() => setScopes(new Map(scopesRef.current)), [])

  const register = useCallback((scope: string, bindings: Binding[]) => {
    if (!scopeOrder.current.has(scope)) scopeOrder.current.set(scope, scopeOrder.current.size)
    if (import.meta.env.DEV) warnOnCollisions(scope, bindings, scopesRef.current)
    scopesRef.current.set(scope, bindings)
    commit()
    return () => { scopesRef.current.delete(scope); commit() }
  }, [commit])

  const bindings = useMemo(
    () => [...scopes.entries()]
      .sort(([a], [b]) => (scopeOrder.current.get(a) ?? 0) - (scopeOrder.current.get(b) ?? 0))
      .flatMap(([, list]) => list),
    [scopes],
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

  const value = useMemo(() => ({ register, bindings }), [register, bindings])

  return (
    <KeyboardContext.Provider value={value}>
      {children}
      <CommandLine open={commandOpen} onOpenChange={setCommandOpen} destinations={destinations} />
      <KeySheet open={sheetOpen} onOpenChange={setSheetOpen} bindings={bindings} />
    </KeyboardContext.Provider>
  )
}
