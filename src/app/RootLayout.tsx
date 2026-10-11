import { Outlet } from 'react-router-dom'
import { KeyboardProvider } from '@/kit/keyboard/KeyboardProvider'
import { useDestinations } from './use-destinations'

export function RootLayout() {
  return (
    <KeyboardProvider destinations={useDestinations()}>
      <div className="flex min-h-screen flex-col">
        <Outlet />
      </div>
    </KeyboardProvider>
  )
}
