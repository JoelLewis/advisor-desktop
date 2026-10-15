import { useId } from 'react'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { Dialog } from '@/kit/dialog/Dialog'
import type { Binding } from './keys'
import { MODIFIER_WORD } from './single-keys'

type KeySheetProps = {
  open: boolean
  onOpenChange: (o: boolean) => void
  bindings: Binding[]
  singleKeys: boolean
  onSingleKeys: (on: boolean) => void
}

export function KeySheet({ open, onOpenChange, bindings, singleKeys, onSingleKeys }: KeySheetProps) {
  const noteId = useId()
  const global = [
    { key: singleKeys ? `/ or ${MODIFIER_WORD} K` : `${MODIFIER_WORD} K`, label: 'Command line' },
    { key: singleKeys ? `? or ${MODIFIER_WORD} /` : `${MODIFIER_WORD} /`, label: 'This key sheet' },
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Checkbox role="switch" label="Single-key shortcuts" checked={singleKeys} onChange={onSingleKeys} describedBy={noteId} />
          <p id={noteId} className="text-label text-ink-3">Off: single keys such as t, / and ? do nothing, for speech input. Ctrl/⌘ K and Ctrl/⌘ / always work; keys on a focused table row and ⌘S or Ctrl+S always work.</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
          {[...global, ...(singleKeys ? bindings : [])].map((b, i) => (
            <div key={`${i}-${b.key}-${b.label}`} className="contents">
              <dt><kbd className="border border-ink-2 px-1.5 text-label">{b.key}</kbd></dt>
              <dd>{b.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Dialog>
  )
}
