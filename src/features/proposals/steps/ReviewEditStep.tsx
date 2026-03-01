import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, Sparkles, Loader2 } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DocumentPreviewCard } from './DocumentPreviewCard'
import { useProposal, useUpdateSection, useGenerateSection } from '@/hooks/use-proposals'
import type { ProposalSection } from '@/types/proposal'

type ReviewEditStepProps = {
  proposalId: string
}

type ViewMode = 'preview' | 'edit'

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'preview', label: 'Document Preview' },
  { id: 'edit', label: 'Edit Sections' },
]

export function ReviewEditStep({ proposalId }: ReviewEditStepProps) {
  const { data: proposal } = useProposal(proposalId)
  const updateSection = useUpdateSection(proposalId)
  const regenerateSection = useGenerateSection(proposalId)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [regenerating, setRegenerating] = useState<string | null>(null)

  if (!proposal) return null

  function toggleSection(sectionId: string) {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId))
  }

  function getEditValue(section: ProposalSection): string {
    return editValues[section.id] ?? section.content
  }

  function handleSave(section: ProposalSection) {
    const content = editValues[section.id]
    if (content !== undefined && content !== section.content) {
      updateSection.mutate({ sectionId: section.id, content })
    }
  }

  function handleReset(section: ProposalSection) {
    setEditValues((prev) => {
      const next = { ...prev }
      delete next[section.id]
      return next
    })
    if (section.originalContent !== section.content) {
      updateSection.mutate({ sectionId: section.id, content: section.originalContent })
    }
  }

  function handleRegenerate(section: ProposalSection) {
    setRegenerating(section.type)
    regenerateSection.mutate(section.type, {
      onSettled: () => {
        setRegenerating(null)
        // Clear local edit for this section
        setEditValues((prev) => {
          const next = { ...prev }
          delete next[section.id]
          return next
        })
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-body font-semibold text-text-primary">Review & Edit Sections</h3>
          <p className="text-caption text-text-secondary">
            {viewMode === 'preview'
              ? 'Preview the proposal as it will appear to clients.'
              : 'Click a section to expand and edit. Changes are saved when you collapse the section.'}
          </p>
        </div>
        <SegmentedControl options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'preview' ? (
        <DocumentPreviewCard sections={proposal.sections} />
      ) : (
        <div className="divide-y divide-border-primary rounded-lg border border-border-primary">
          {proposal.sections.map((section) => {
            const isExpanded = expandedSection === section.id
            const isEdited = section.status === 'edited' || (editValues[section.id] !== undefined && editValues[section.id] !== section.content)
            const isRegenerating = regenerating === section.type

            return (
              <div key={section.id}>
                <button
                  onClick={() => {
                    if (isExpanded) handleSave(section)
                    toggleSection(section.id)
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-text-tertiary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-text-tertiary" />
                    )}
                    <span className="text-body font-medium text-text-primary">{section.label}</span>
                    {isEdited && (
                      <span className="inline-flex items-center rounded-full bg-accent-blue/10 px-2 py-0.5 text-[10px] font-medium text-accent-blue">
                        Edited
                      </span>
                    )}
                    {section.status === 'generated' && !isEdited && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-purple/10 px-2 py-0.5 text-[10px] font-medium text-accent-purple">
                        <Sparkles className="h-2.5 w-2.5" /> AI Generated
                      </span>
                    )}
                  </div>
                  <span className="text-caption text-text-tertiary">
                    {section.content.length > 0 ? `${section.content.split('\n').length} lines` : 'Empty'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-border-primary bg-surface-secondary/50 px-4 py-4">
                    <textarea
                      value={getEditValue(section)}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [section.id]: e.target.value }))}
                      rows={12}
                      className="w-full rounded-md border border-border-secondary bg-surface-primary p-3 font-mono text-caption text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
                      placeholder="Section content..."
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleReset(section)}
                        className="flex items-center gap-1 rounded-md border border-border-primary px-3 py-1.5 text-caption font-medium text-text-secondary hover:bg-surface-tertiary"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset to Original
                      </button>
                      <button
                        onClick={() => handleRegenerate(section)}
                        disabled={isRegenerating}
                        className="flex items-center gap-1 rounded-md border border-accent-purple/30 px-3 py-1.5 text-caption font-medium text-accent-purple hover:bg-accent-purple/5 disabled:opacity-40"
                      >
                        {isRegenerating ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating...</>
                        ) : (
                          <><Sparkles className="h-3 w-3" /> Regenerate</>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          handleSave(section)
                          toggleSection(section.id)
                        }}
                        className="ml-auto rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90"
                      >
                        Save & Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
