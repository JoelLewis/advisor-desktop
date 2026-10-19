import type { BindingActKind } from '@/types/workspace'

/** The record kinds an outsider may read in their own thread: what reached them. */
export const PARTY_VISIBLE_ACTS: ReadonlySet<BindingActKind> = new Set<BindingActKind>(['send_to_party', 'deliver_disclosure', 'accept_proposal'])
