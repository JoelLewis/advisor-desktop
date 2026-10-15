import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { MAIN_ID, PAGE_TITLE_ID } from '@/kit/page/ids'

/**
 * On every pathname change after the first load, focus the routed page's h1. A page still loading
 * has none yet: focus #main, then hand focus to the h1 when it renders, unless the user has moved it.
 *
 * `shownInstead` names the region to focus when the page is not what shows: on a phone the shell may
 * open a path on its thread list or context column, where the h1 is hidden and cannot take focus.
 */
export function useFocusOnRouteChange(shownInstead: string | undefined): void {
  const { pathname } = useLocation()
  const focusedFor = useRef(pathname)
  const instead = useRef(shownInstead)
  instead.current = shownInstead

  useEffect(() => {
    if (focusedFor.current === pathname) return
    focusedFor.current = pathname
    const region = instead.current === undefined ? undefined : document.getElementById(instead.current)
    if (region) { region.focus(); return }
    const main = document.getElementById(MAIN_ID)
    const title = document.getElementById(PAGE_TITLE_ID)
    if (title) { title.focus(); return }
    if (!main) return
    main.focus()
    const observer = new MutationObserver(() => {
      const rendered = document.getElementById(PAGE_TITLE_ID)
      if (!rendered) return
      observer.disconnect()
      if (document.activeElement === main) rendered.focus()
    })
    observer.observe(main, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pathname])
}
