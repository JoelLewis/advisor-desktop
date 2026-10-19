import { createContext } from 'react'

export const AnnouncerContext = createContext<((message: string) => void) | null>(null)
