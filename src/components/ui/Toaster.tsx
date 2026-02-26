import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: 'border-border-primary bg-surface-primary text-text-primary shadow-lg',
        descriptionClassName: 'text-text-secondary',
        style: {
          borderLeft: '3px solid var(--accent-blue)',
        },
      }}
      richColors
    />
  )
}
