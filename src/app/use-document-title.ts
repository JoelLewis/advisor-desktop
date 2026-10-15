import { useEffect } from 'react'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { documentTitleOf } from './document-title'

/**
 * Keeps the document title equal to the routed page's h1 and the app's name. Pages render their h1 when
 * their data arrives, so the title follows the h1 as it appears or changes rather than being set per route.
 */
export function useDocumentTitle(): void {
  useEffect(() => {
    const apply = () => {
      const heading = document.getElementById(PAGE_TITLE_ID)?.textContent?.trim()
      if (heading) document.title = documentTitleOf(heading)
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])
}
