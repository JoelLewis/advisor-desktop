/** What a lazy page shows while its chunk loads on a first visit: a status inside the shell's main, replaced by the page and its h1. */
export function PageLoading() {
  return <p role="status" className="text-body text-ink-3">Loading the page…</p>
}
