/** The README's eight steps, in order. */
export const STORY_STEP_IDS = ['brief', 'rebalance', 'release', 'blotter', 'meeting', 'pell', 'reference', 'view_as'] as const
export type StoryStepId = (typeof STORY_STEP_IDS)[number]
export type StoryProgress = { steps: { id: StoryStepId; done: boolean }[]; next: StoryStepId | null }
