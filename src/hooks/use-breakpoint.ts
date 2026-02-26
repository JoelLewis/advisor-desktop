import { useSyncExternalStore } from 'react'

const XL_QUERY = '(min-width: 1280px)'
const TWO_XL_QUERY = '(min-width: 1536px)'

type Breakpoint = {
  /** 1024–1279px — collapsed sidebar, overlay AI panel, stacked grids */
  isBase: boolean
  /** 1280–1535px — default sidebar collapsed, AI panel pushes, 2-3 col grids */
  isXL: boolean
  /** 1536px+ — expanded sidebar, full density grids */
  is2XL: boolean
}

function createMediaSubscription(query: string) {
  const mql = window.matchMedia(query)

  function subscribe(callback: () => void) {
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
  }

  function getSnapshot() {
    return mql.matches
  }

  // SSR fallback — not relevant for this app but keeps the API correct
  function getServerSnapshot() {
    return false
  }

  return { subscribe, getSnapshot, getServerSnapshot }
}

const xlSub = createMediaSubscription(XL_QUERY)
const twoXlSub = createMediaSubscription(TWO_XL_QUERY)

export function useBreakpoint(): Breakpoint {
  const isXL = useSyncExternalStore(xlSub.subscribe, xlSub.getSnapshot, xlSub.getServerSnapshot)
  const is2XL = useSyncExternalStore(twoXlSub.subscribe, twoXlSub.getSnapshot, twoXlSub.getServerSnapshot)

  return {
    isBase: !isXL,
    isXL,
    is2XL,
  }
}
