import { useContext, useEffect, useRef } from 'react'
import { KeyboardContext } from './keyboard-context'
import type { Binding } from './keys'

const signatureOf = (bindings: Binding[]) => bindings.map((b) => `${b.key}\u0000${b.label}`).join('\u0001')

export function useJumpKeys(scope: string, bindings: Binding[]): void {
  const ctx = useContext(KeyboardContext)
  if (!ctx) throw new Error('useJumpKeys must be used inside KeyboardProvider')
  const { register } = ctx
  const latest = useRef(bindings)
  latest.current = bindings
  const signature = signatureOf(bindings)

  useEffect(() => {
    const stable = latest.current.map((b, i): Binding => ({
      key: b.key,
      label: b.label,
      run: () => latest.current[i]?.run(),
    }))
    return register(scope, stable)
    // signature stands in for the bindings' identity; run closures are read through the ref.
  }, [register, scope, signature])
}
