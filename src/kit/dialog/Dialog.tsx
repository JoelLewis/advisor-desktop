import { useRef, type ReactNode } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { PAGE_TITLE_ID } from '@/kit/page/ids'

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  // The opener is not a Radix Trigger, so Radix has no ref to return focus to; keep our own.
  const opener = useRef<HTMLElement | null>(null)
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-ink/40" />
        <RadixDialog.Content
          className="fixed left-1/2 top-1/2 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border border-ink bg-face p-6 text-ink"
          {...(description ? {} : { 'aria-describedby': undefined })}
          onOpenAutoFocus={() => {
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            const target = opener.current?.isConnected && opener.current !== document.body
              ? opener.current
              : document.getElementById(PAGE_TITLE_ID)
            opener.current = null
            target?.focus()
          }}
        >
          <RadixDialog.Title className="text-title">{title}</RadixDialog.Title>
          {description ? <RadixDialog.Description className="mt-1 text-body text-ink-2">{description}</RadixDialog.Description> : null}
          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
