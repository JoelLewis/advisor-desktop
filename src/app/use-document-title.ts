import { useEffect } from 'react'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { documentTitleOf } from './document-title'

/**
 * Keeps the document title equal to the routed page's h1 and the brand: the app's name to the firm, the firm's to a
 * client or a prospect. Pages render their h1 when their data arrives, so the title follows the h1 as it appears or
 * changes rather than being set per route. With no h1 (loading, a viewer switch in flight) the title is the brand
 * alone, so a firm page's title never outlives its page.
 */
export function useDocumentTitle(brandName: string): void {
  useEffect(() => {
    const apply = () => {
      const heading = document.getElementById(PAGE_TITLE_ID)?.textContent?.trim()
      document.title = heading ? documentTitleOf(heading, brandName) : brandName
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [brandName])
}
