export type StepState = 'READY' | 'PREVIEWED' | 'OPEN' | 'DRAFT' | 'DONE'
export type Step = { id: string; label: string; state: StepState }
