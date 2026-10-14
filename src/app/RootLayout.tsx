import { Outlet } from 'react-router-dom'
import { AnnouncerProvider } from '@/kit/announcer/AnnouncerProvider'
import { KeyboardProvider } from '@/kit/keyboard/KeyboardProvider'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { useDestinations } from './use-destinations'

export function RootLayout() {
  const { viewerId } = useViewer()
  return (
    <AnnouncerProvider resetKey={viewerId}>
      <KeyboardProvider destinations={useDestinations()}>
        <div className="flex min-h-screen flex-col">
          <Outlet />
        </div>
      </KeyboardProvider>
    </AnnouncerProvider>
  )
}
