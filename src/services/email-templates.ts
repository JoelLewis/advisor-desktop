import { get, post, put, del } from './api-client'
import type { EmailTemplate, TemplateCategory } from '@/types/email-template'

export function getEmailTemplates(category?: TemplateCategory) {
  const params = category ? `?category=${category}` : ''
  return get<EmailTemplate[]>(`/settings/email-templates${params}`)
}

export function getEmailTemplate(id: string) {
  return get<EmailTemplate>(`/settings/email-templates/${id}`)
}

export function createEmailTemplate(template: Pick<EmailTemplate, 'name' | 'subject' | 'body' | 'category'>) {
  return post<EmailTemplate>('/settings/email-templates', template)
}

export function updateEmailTemplate(id: string, data: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'body' | 'category'>>) {
  return put<EmailTemplate>(`/settings/email-templates/${id}`, data)
}

export function deleteEmailTemplate(id: string) {
  return del<void>(`/settings/email-templates/${id}`)
}
