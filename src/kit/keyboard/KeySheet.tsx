import { Dialog } from '@/kit/dialog/Dialog'
import type { Binding } from './keys'

const GLOBAL = [{ key: '/', label: 'Command line' }, { key: '?', label: 'This key sheet' }]

export function KeySheet({ open, onOpenChange, bindings }: { open: boolean; onOpenChange: (o: boolean) => void; bindings: Binding[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
        {[...GLOBAL, ...bindings].map((b) => (
          <div key={b.key + b.label} className="contents">
            <dt><kbd className="border border-ink-2 px-1.5 text-label">{b.key}</kbd></dt>
            <dd>{b.label}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
