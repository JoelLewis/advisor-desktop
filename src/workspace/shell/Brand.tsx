import { Link } from 'react-router-dom'
import { LINK_TARGET } from '@/kit/link-target'
import { useViewer } from '@/workspace/viewer/use-viewer'

/** The header's home link: the product to the firm; the firm, and the viewer's own name, to an outsider. */
export function Brand() {
  const { brand } = useViewer()
  return (
    <div className="flex items-baseline gap-3">
      <Link to="/" className={`${LINK_TARGET} text-body font-semibold uppercase stretch-wide`}>{brand.name}</Link>
      {brand.viewerName ? <span className="text-body text-ink-2">{brand.viewerName}</span> : null}
    </div>
  )
}
