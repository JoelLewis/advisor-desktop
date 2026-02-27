import Markdown from 'react-markdown'
import type { ProposalSection } from '@/types/proposal'

type DocumentPreviewCardProps = {
  sections: ProposalSection[]
}

export function DocumentPreviewCard({ sections }: DocumentPreviewCardProps) {
  const nonEmpty = sections.filter((s) => s.content.trim() !== '')

  if (nonEmpty.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-8 text-center">
        <p className="text-caption text-text-tertiary">No section content to preview.</p>
      </div>
    )
  }

  const markdown = nonEmpty
    .map((s) => s.content)
    .join('\n\n---\n\n')

  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary shadow-sm">
      <div className="px-8 py-6">
        <article
          className="prose prose-sm max-w-none
            prose-headings:font-semibold prose-headings:text-text-primary
            prose-p:text-text-secondary prose-p:leading-relaxed
            prose-strong:text-text-primary prose-strong:font-semibold
            prose-a:text-accent-blue prose-a:no-underline hover:prose-a:underline
            prose-th:text-text-secondary prose-th:font-medium prose-th:text-left
            prose-td:text-text-secondary
            prose-table:border-collapse
            prose-hr:border-border-primary
            prose-li:text-text-secondary
            prose-ul:text-text-secondary
            prose-ol:text-text-secondary"
        >
          <Markdown>{markdown}</Markdown>
        </article>
      </div>
    </div>
  )
}
