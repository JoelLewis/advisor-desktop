export type Role = 'advisor' | 'csa' | 'analyst' | 'compliance' | 'client'
export type Person = { id: string; name: string; role: Role }
export type AgentId = 'drift-monitor' | 'pretrade-check'
export type AgentScope = { may: string[]; mayNot: string[] }
export type AgentProfile = { id: AgentId; name: string; scope: AgentScope }
export type Visibility = 'private' | 'internal' | 'client'
export type Subject = { type: 'account' | 'household' | 'client' | 'draft'; id: string }
export type Thread = { id: string; title: string; visibility: Visibility; ownerId?: string; clientId?: string; memberIds: string[]; agentIds: AgentId[]; subject?: Subject }
export type FigureUnit = 'USD' | 'pp' | '%' | 'sh' | 'd'
export type Figure = { label: string; value: number; unit: FigureUnit; source: string }   // pp and % values are fractions (0.132)
export type Citation = { source: string; asOf: string }
export type Attention = 'info' | 'attention'
export type EmbedKind = 'drift' | 'rebalance_preview'
export type Message =
  | { kind: 'text'; id: string; threadId: string; authorId: string; at: string; body: string }
  | { kind: 'agent_finding'; id: string; threadId: string; agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention; runKey: string }
  | { kind: 'embed'; id: string; threadId: string; authorId: string; at: string; embed: EmbedKind; subject: Subject }
  | { kind: 'act'; id: string; threadId: string; at: string; actId: string }
export type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'dispose_exception' | 'send_to_client'
export type BindingAct = { id: string; kind: BindingActKind; actorId: string; at: string; threadId: string; subject?: Subject; fingerprint: string; summary: string }
export type Draft = { id: string; clientThreadId: string; authorId: string; body: string; createdAt: string }
export type ThreadDetail = { thread: Thread; messages: Message[] }
export type Act = BindingActKind | 'post_firm' | 'draft_for_client' | 'read_all_firm_threads'
/** permissions: personId → the acts that person may perform, computed by the engine's can(). The UI never derives permissions itself. */
export type Directory = { people: Person[]; agents: AgentProfile[]; permissions: Record<string, Act[]> }
