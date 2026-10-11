import { createContext } from 'react'
import type { Binding } from './keys'

export type KeyboardContextValue = {
  register: (token: string, scope: string, bindings: Binding[]) => () => void
  bindings: Binding[]
}

export const KeyboardContext = createContext<KeyboardContextValue | null>(null)
