import { useCallback, useState } from 'react'
import { readBookMode, storeBookMode, type BookMode } from './book-mode'

/** The viewer's mode, read from their own stored choice; switching View as reads the new viewer's. */
export function useBookMode(viewerId: string): [BookMode, (mode: BookMode) => void] {
  const [chosen, setChosen] = useState<{ viewerId: string; mode: BookMode }>()
  const mode = chosen?.viewerId === viewerId ? chosen.mode : readBookMode(viewerId)
  const choose = useCallback((next: BookMode) => {
    storeBookMode(viewerId, next)
    setChosen({ viewerId, mode: next })
  }, [viewerId])
  return [mode, choose]
}
