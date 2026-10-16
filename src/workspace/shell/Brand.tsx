import { Link } from 'react-router-dom'
import { LINK_TARGET } from '@/kit/link-target'
import { useDirectory } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { brandOf } from './brand-words'

/** The header's home link: the product to the firm; the firm, and the viewer's own name, to an outsider. */
export function Brand() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  const brand = brandOf(directory.data, viewerId)
  return (
    <div className="flex items-baseline gap-3">
      <Link to="/" className={`${LINK_TARGET} text-body font-semibold uppercase stretch-wide`}>{brand.name}</Link>
      {brand.viewerName ? <span className="text-body text-ink-2">{brand.viewerName}</span> : null}
    </div>
  )
}
