import { useContext, useEffect } from 'react'
import { KeyboardContext } from './keyboard-context'
import type { Binding } from './keys'

export function useJumpKeys(scope: string, bindings: Binding[]): void {
  const ctx = useContext(KeyboardContext)
  if (!ctx) throw new Error('useJumpKeys must be used inside KeyboardProvider')
  const { register } = ctx
  useEffect(() => register(scope, bindings), [register, scope, bindings])
}
