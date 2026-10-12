import { useEffect, useRef } from 'react'

const OPEN_DIALOG = '[role="dialog"][data-state="open"]'
/** Marks the one text field mod+S saves from: the draft's own quantity. */
export const SAVES_DRAFT_ATTRIBUTE = 'data-saves-draft'

const NOT_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'])

/** Somewhere a person types; a checkbox or a button is not. */
const isTextField = (el: HTMLElement) =>
  el.isContentEditable || el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !NOT_TEXT.has(el.type))

const savesFrom = (target: EventTarget | null) =>
  !(target instanceof HTMLElement) || !isTextField(target) || target.closest(`[${SAVES_DRAFT_ATTRIBUTE}]`) !== null

/**
 * ⌘S / Ctrl+S saves the draft. The browser's save dialog never opens on this page; the draft saves only
 * from outside text fields (the quantity field excepted) and never while a dialog is open.
 */
export function useSaveShortcut(onSave: () => void, enabled: boolean): void {
  const latest = useRef(onSave)
  useEffect(() => {
    latest.current = onSave
  })
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 's') return
      e.preventDefault()
      if (e.repeat || document.querySelector(OPEN_DIALOG) || !savesFrom(e.target)) return
      latest.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
