import type { Role } from '@/types/workspace'

/** A party outside the firm: a client, or a prospect who is not yet one. */
export type PartyKind = 'client' | 'prospect'

const EXTERNAL_ROLES: ReadonlySet<Role> = new Set<Role>(['client', 'prospect'])

/**
 * The one predicate behind every firm gate: whether a role is outside the firm. An outsider sees only
 * their own thread and is told every firm surface does not exist. The engine and the UI both read it.
 */
export const isExternalRole = (role: Role): role is PartyKind => EXTERNAL_ROLES.has(role)
