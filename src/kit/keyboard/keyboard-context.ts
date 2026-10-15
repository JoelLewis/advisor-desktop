import { createContext } from 'react'
import type { Binding } from './keys'

export type KeyboardContextValue = {
  register: (token: string, scope: string, bindings: Binding[]) => () => void
  bindings: Binding[]
  singleKeys: boolean
  setSingleKeys: (on: boolean) => void
  /** Test seam: how many registrations the legend order still remembers. */
  orderSize: () => number
}

export const KeyboardContext = createContext<KeyboardContextValue | null>(null)
