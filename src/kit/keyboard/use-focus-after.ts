import { useCallback } from 'react'
import { PAGE_TITLE_ID } from '@/kit/page/ids'

export function useFocusAfter(): (targetId?: string) => void {
  return useCallback((targetId?: string) => {
    requestAnimationFrame(() => {
      const target = (targetId ? document.getElementById(targetId) : null) ?? document.getElementById(PAGE_TITLE_ID)
      target?.focus()
    })
  }, [])
}
