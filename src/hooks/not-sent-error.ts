/** The draft was saved but the send was refused: the draft waits in the drafts panel. */
export class NotSentError extends Error {
  constructor(readonly draftId: string, reason: string) {
    super(`Saved as a draft; not sent: ${reason}`)
    this.name = 'NotSentError'
  }
}
