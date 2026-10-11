import { useContext } from 'react'
import { KeyboardContext } from './keyboard-context'

export function KeyLegend() {
  const ctx = useContext(KeyboardContext)
  const items = [{ key: '/', label: 'command' }, { key: '?', label: 'all keys' }, ...(ctx?.bindings ?? [])]
  return (
    <footer className="mx-auto flex max-w-[1440px] flex-wrap gap-4 border-t border-rule px-6 py-3 text-label text-ink-3">
      {items.map((b) => (
        <span key={b.key + b.label} className="inline-flex items-center gap-1.5">
          <kbd className="border border-ink-3 px-1">{b.key}</kbd>
          <span className="normal-case">{b.label}</span>
        </span>
      ))}
    </footer>
  )
}
