import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KeyboardContext } from './keyboard-context'
import { isEditableTarget, type Binding, type Destination } from './keys'
import { CommandLine } from './CommandLine'
import { KeySheet } from './KeySheet'

export function KeyboardProvider({ destinations, children }: { destinations: Destination[]; children: ReactNode }) {
  const [scopes, setScopes] = useState<Map<string, Binding[]>>(new Map())
  const [commandOpen, setCommandOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const register = useCallback((scope: string, bindings: Binding[]) => {
    setScopes((prev) => new Map(prev).set(scope, bindings))
    return () => setScopes((prev) => { const next = new Map(prev); next.delete(scope); return next })
  }, [])

  const bindings = useMemo(() => [...scopes.values()].flat(), [scopes])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isEditableTarget(e.target)) return
      if (commandOpen || sheetOpen) return
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
