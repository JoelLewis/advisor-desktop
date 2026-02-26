import { Check, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentChecklistItem } from '@/types/onboarding'

type DocumentsStepProps = {
  documents: DocumentChecklistItem[]
  onToggle: (docId: string) => void
}

export function DocumentsStep({ documents, onToggle }: DocumentsStepProps) {
  const received = documents.filter((d) => d.received).length
  const total = documents.length

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 text-text-primary">Document Checklist</h3>
        <p className="mt-1 text-caption text-text-secondary">
          Mark documents as received. All required documents must be collected before submission.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className="h-full rounded-full bg-accent-green transition-all duration-300"
            style={{ width: `${total > 0 ? (received / total) * 100 : 0}%` }}
          />
        </div>
        <span className="text-caption font-medium text-text-secondary">{received}/{total} received</span>
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onToggle(doc.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              doc.received
                ? 'border-accent-green/30 bg-accent-green/5'
                : 'border-border-primary hover:bg-surface-tertiary',
            )}
          >
            <div className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded',
              doc.received
                ? 'bg-accent-green text-white'
                : 'border border-border-secondary bg-surface-primary',
            )}>
              {doc.received && <Check className="h-3.5 w-3.5" />}
            </div>
            <FileText className={cn('h-4 w-4 shrink-0', doc.received ? 'text-accent-green' : 'text-text-tertiary')} />
            <div className="flex-1">
              <span className={cn('text-body', doc.received ? 'text-accent-green' : 'text-text-primary')}>
                {doc.name}
              </span>
              {doc.required && !doc.received && (
                <span className="ml-2 text-[10px] text-accent-red">Required</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="flex h-32 items-center justify-center text-caption text-text-tertiary">
          Select an account type to see required documents
        </div>
      )}
    </div>
  )
}
