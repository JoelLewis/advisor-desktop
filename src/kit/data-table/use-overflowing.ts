import { useEffect, useState, type RefObject } from 'react'

export const isOverflowing = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1

/** Whether the element scrolls sideways now, following its size. */
export function useOverflowing(ref: RefObject<HTMLElement | null>): boolean {
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflowing(isOverflowing(el))
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [ref])
  return overflowing
}
