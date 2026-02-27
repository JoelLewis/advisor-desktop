import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '@/services/email-templates'
import type { EmailTemplate, TemplateCategory } from '@/types/email-template'

export function useEmailTemplates(category?: TemplateCategory) {
  return useQuery({
    queryKey: ['settings', 'email-templates', category],
    queryFn: () => getEmailTemplates(category),
  })
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (template: Pick<EmailTemplate, 'name' | 'subject' | 'body' | 'category'>) =>
      createEmailTemplate(template),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'email-templates'] }),
  })
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Pick<EmailTemplate, 'name' | 'subject' | 'body' | 'category'>>) =>
      updateEmailTemplate(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'email-templates'] }),
  })
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEmailTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'email-templates'] }),
  })
}
