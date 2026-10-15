/** Which half of the start failed: the demo's code (the app chunk) or its in-browser server (the MSW worker). */
export type StartStage = 'app' | 'server'

/** A start that failed, and where: the page says which, and what the browser reported. */
export class StartFailure extends Error {
  constructor(readonly stage: StartStage, reported: unknown) {
    super(reported instanceof Error ? reported.message : String(reported))
    this.name = 'StartFailure'
  }
}
