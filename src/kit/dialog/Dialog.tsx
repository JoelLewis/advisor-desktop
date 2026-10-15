import { useRef, type ReactNode } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { Button } from '@/kit/button/Button'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { Unbroken } from '@/kit/unbroken/Unbroken'

type DialogProps = {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode
  /** False when the caller moves focus itself after closing, e.g. to the page it navigated to. */
  returnFocus?: boolean
}

export function Dialog({ open, onOpenChange, title, description, children, returnFocus = true }: DialogProps) {
  // The opener is not a Radix Trigger, so Radix has no ref to return focus to; keep our own.
  const opener = useRef<HTMLElement | null>(null)
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay data-part="scrim" className="fixed inset-0 bg-scrim/50" />
        <RadixDialog.Content
          className="fixed left-1/2 top-1/2 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 max-h-[calc(100vh-2rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] overflow-y-auto border border-ink bg-face p-6 text-ink"
          {...(description ? {} : { 'aria-describedby': undefined })}
          onOpenAutoFocus={() => {
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            // Radix reports the close a tick after unmounting; by then the page may have moved focus on purpose
            // (e.g. to a record slip when the dialog's panel left the page), and that focus stands.
            const active = document.activeElement
            const movedOnPurpose = active instanceof HTMLElement && active !== document.body && active.isConnected
            if (!returnFocus || movedOnPurpose) { opener.current = null; return }
            const target = opener.current?.isConnected && opener.current !== document.body
              ? opener.current
              : document.getElementById(PAGE_TITLE_ID)
            opener.current = null
            target?.focus()
          }}
        >
          <RadixDialog.Title className="pr-24 text-title"><Unbroken text={title} /></RadixDialog.Title>
          {description ? <RadixDialog.Description className="mt-1 pr-24 text-body text-ink-2">{description}</RadixDialog.Description> : null}
          <div className="mt-4">{children}</div>
          {/* Last in the DOM so opening still focuses the dialog's own first control; placed top-right. */}
          <Button rank="secondary" className="absolute right-6 top-6" onClick={() => onOpenChange(false)}>Close</Button>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
