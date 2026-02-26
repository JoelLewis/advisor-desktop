import { Sparkles } from 'lucide-react'
import { ActionTemplateCard } from './ActionTemplateCard'
import { useActionTemplates } from '@/hooks/use-ai'

type ActionTemplateGridProps = {
  screenType: string
}

export function ActionTemplateGrid({ screenType }: ActionTemplateGridProps) {
  const { data: templates } = useActionTemplates(screenType)

  if (!templates || templates.length === 0) return null

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-accent-purple" />
        <h3 className="text-caption font-medium text-text-secondary">Quick Actions</h3>
      </div>
      <div className="space-y-2">
        {templates.slice(0, 4).map((template) => (
          <ActionTemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  )
}
