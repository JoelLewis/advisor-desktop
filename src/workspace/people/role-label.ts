import type { Person, Role } from '@/types/workspace'

export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  advisor: 'Advisor',
  csa: 'Client service',
  analyst: 'Analyst',
  compliance: 'Compliance',
  client: 'Client',
}

export const personWithRole = (person: Person) => `${person.name} · ${ROLE_LABEL[person.role]}`
