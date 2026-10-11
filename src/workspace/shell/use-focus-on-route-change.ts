import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { MAIN_ID, PAGE_TITLE_ID } from '@/kit/page/ids'

/**
 * On every pathname change after the first load, focus the routed page's h1. A page still loading
 * has none yet: focus #main, then hand focus to the h1 when it renders, unless the user has moved it.
 */
export function useFocusOnRouteChange(): void {
  const { pathname } = useLocation()
  const focusedFor = useRef(pathname)

  useEffect(() => {
    if (focusedFor.current === pathname) return
    focusedFor.current = pathname
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
