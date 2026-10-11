import { useMemo } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { KeyboardProvider } from '@/kit/keyboard/KeyboardProvider'
import { KeyLegend } from '@/kit/keyboard/KeyLegend'
import type { Destination } from '@/kit/keyboard/keys'

export function RootLayout() {
  const navigate = useNavigate()
  const destinations = useMemo<Destination[]>(() => [
    { id: 'home', label: 'Workspace home', aliases: ['home'], run: () => navigate('/') },
    { id: 'kit', label: 'Component kit', aliases: ['kit', 'components', 'gallery'], run: () => navigate('/kit') },
  ], [navigate])
  return (
    <KeyboardProvider destinations={destinations}>
      <Outlet />
      <KeyLegend />
    </KeyboardProvider>
  )
}
