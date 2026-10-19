# Phase 9: advisor clarity

**Date:** 15 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Inputs:** `docs/audits/2026-10-15-advisor-clarity-critique.md` (5 priority issues and minors) and `docs/audits/2026-10-15-language-findings.md` (the glossary, inconsistencies with file:line or route, and the top 10 copy changes).
**Builds on:** the polish round, on branch `workspace` @ c45213e. `main` is untouched until the user approves the branch.

## Goal

An advisor sitting down cold should be able to tell in ten seconds who will read what they are about to write. The workspace should speak a practitioner's language rather than the system's. The flagship story should show the product catching a suitability problem instead of quietly containing one, and the client letters should read like a person wrote them.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Suitability contradiction | The product flags it: a pre-trade check for a model above the client's tolerance, and approval requires a recorded reason |
| What outsiders see in the header | Firm viewers see "Advisor Desktop". Clients and prospects see "Larkfield Advisory" and their own name, and the thread speaks to them in the second person |
| The dashed, hatched and solid patterns | Kept as a secondary cue beside the words. The legend goes. A client-visible thread also gets a filled band tint |

## 1. Who sees what

- **One vocabulary, naming people.**
  - Thread-list groups: **Just me**, **Larkfield team**, **Client conversations** (prospects are included here).
  - The band at the top of each thread: **"Just you"**; **"Larkfield team · <party first name> can't see this"**, or "Larkfield team · no client can see this" when the thread has no party; **"<Party full name> can read this"**.
  - The pattern stays as a small mark beside the words. The legend and the old words (PRIVATE, INTERNAL, CLIENTS AND PROSPECTS, CLIENT CAN SEE, PROSPECT CAN SEE, "Firm only · client can't see", "Only you") are removed everywhere.
- **Client-visible threads are loud.**
  - A filled band tint, from a new token with light and dark values that passes contrast in both.
  - The composer label reads "Message to <full name>", and the primary button reads **"Send to <first name>"**.
  - The drafts panel uses the same naming.
  - Internal threads keep their own label: "Post to the team".
- **A roster under the title.** A one-line "Who can see" list sits under each thread's title, naming each person and role (for example "Robert Johnson · Client, Adrian Hale · Advisor, …"). The context column no longer repeats it.
- **Honest to outsiders.**
  - Client and prospect views read: "You and the Larkfield team. Messages are kept and reviewed by compliance, as the law requires."
  - Their roster includes "Larkfield compliance (review)".
  - Their header shows "Larkfield Advisory" and their own name. The thread title addresses them ("Your conversation with Larkfield").
  - Nothing firm-only becomes visible: the external-party boundary is unchanged.

## 2. Plain vocabulary

**Swaps, applied everywhere in UI copy, aria labels and tests:**

| Old | New |
|---|---|
| Take to ▾ | Share to ▾ |
| carried by | shared by |
| Binding acts | Audit trail |
| Thread context | Details |
| Full views | Related records |
| Desk / Reference | Firm / Reports |
| MAY / MAY NOT | Can / Can't |
| "reading", "moved book", "the engine" | Removed; plain wording |

**"Binding" is retired.**
- Every act is a **record**. "Approval" and "Release" keep their names as sign-offs.
- Dr. Pell's acceptance reads "Proposal accepted (agreement awaiting signature)".

**Audit details.**
- Fingerprints, UTC time, record ids and internal ids (acc-…, rs-…, brk-…, stg-…, n-…) move into an "Audit details" disclosure on the record slip and in the archive row.
- Prospects and clients never see fingerprints or internal ids.

**Account names.** Accounts read "<Owner> · <Type> (…<last 4>)", with the last four digits taken from the account number in the data.

## 3. The suitability catch

**The check.**
- A new pre-trade check kind: `model_above_tolerance`.
- It fires when a proposal's target model has a risk band above the client's tolerance band. The bands are the existing ones from `bandFor` and the risk score.
- It is a warning, not a block, and it is phrased in words with figures from the kit, for example: "Growth sits above Robert Johnson's Moderate tolerance".

**The approval reason.**
- When the check is present, approving requires a suitability reason.
- The reason is chosen from a short list, with an optional note:
  - "The IPS permits a growth allocation for this account"
  - "Client acknowledged the higher risk in writing"
  - "Part of a household plan that is within tolerance overall"
- The reason is recorded:
  - in the approval act;
  - in the best-interest record, where it applies;
  - in Mark's supervision evidence;
  - in the archive.

**Other surfaces.**
- The Brief's "Needs a decision" gains the line while the proposal is unapproved.
- The Pre-trade Check agent reports it, and its claim is digit-free.

**Separation of duties.** Agents flag; only the advisor approves with a reason; compliance sees the reason.

**Household view (amended 16 Oct 2026, from `docs/audits/2026-10-16-advisor-perspective-review.md`).** An advisor judges suitability household by household. An IRA held more conservatively than a taxable account is asset location, not unsuitability.
- **The household figure.** The engine computes a household risk score as the value-weighted average of its managed accounts' scores, using the same model as the account scores. It is judged against the client's tolerance band.
- **What the check states.** The check reports both the account and the household. Example: "Growth sits above Robert Johnson's Moderate tolerance for this account; the household as a whole is within it." The figures come from the kit.
- **The reason when the household is within its band.** Approval still requires a reason, because the account is outside the client's band. The reason "Part of a household plan that is within tolerance overall" is pre-selected and states the household figure.
- **When the household is also outside its band.** No reason is pre-selected, and the line reads as the stronger warning.
- **Book risk.**
  - Each client gets a household row (household score against tolerance, with status).
  - An account row outside its band is marked "asset location" when its household is within the band.
  - Methods says that account-level status is a screening signal, and that suitability is judged per household.
- **The Brief.** Its decide line uses the same words.

## 4. Client letters

**The recap.**
- It is addressed to both spouses who attended: "Dear Robert and Patricia".
- Instructions are phrased plainly. For example:
  - "Please don't buy Intel shares in any of your accounts until <date>"
  - "We'll model Roth conversion amounts and share them with your CPA"
- A rollover that was asked about reads "You asked about moving your … We'll compare the options and come back to you." That keeps "asked about; comparison to follow" in meaning.
- Tax lines keep "an estimate; please check with your tax professional".

**Dr. Pell's proposal letter** opens with her goals and her concern about the Stryker position, then the proposal. It drops the collectibles sentence.

**Constraints that hold.**
- Every figure still comes from the engine.
- The recap still carries only decisions and client requests: no transcript text and no internal notes.
- No digits are hand-typed.

## 5. Copy pass on the minors

- **Home steps.** Each one says why it matters, then the click, and avoids insider shorthand such as "QAI" or "v3" without context.
- **Demo devices.** Labelled "Demo · …" everywhere: act-as shortcuts, clock jumps and the clock pane. The home page's date line stays true after a jump: "Starts at 25 Feb 2026; the presenter can move the clock forward."
- **Wash-sale wording.** One phrase: "Don't repurchase until <date>" in the workbench column, restrictions, agent citations and the letter. The pane "Wash-sale taxpayer" becomes "Wash-sale restrictions".
- **"Staged" splits.** Orders read "Pending compliance release". The Stryker plan reads "Phased sale over two tax years".
- **Digit-free claims.** The rule still bans hand-typed numbers. Contortions such as "the year the citation states" and "the value the engine states" become phrasing that renders the figure through the kit ("in 2031, at age 73"), with the guard updated to allow kit-formatted figure parts.
- **Labels:**
  - "pooled-vehicle limit" → "single-fund limit"
  - "Disposed today" → "Closed today"
  - agenda "Drop" → "Remove"
  - key sheet "Main" → "Conversation"
  - "Est. tax added to the return" → "Est. additional tax"
  - agent scope grammar fixed

## Testing

**Unit tests.**
- The visibility words per viewer and thread kind.
- The client-side compliance line and roster.
- The `model_above_tolerance` check, and approval refused without a reason.
- The reason recorded in the approval act, the best-interest record, supervision and the archive.
- The recap's salutation and plain instructions.
- Account display names.

**Guards.** A test that the retired words (the old visibility words, "binding", "Take to", "carried", "Thread context", "Full views", "MAY NOT") do not appear in user-facing source or seed copy.

**Visual baselines.** Regenerated where copy moves. Every changed PNG is opened and looked at, and axe stays green on every scene.

**README.** The README and `readme-path.spec.ts` follow the new words and the approval reason step.

## Out of scope

- New features beyond the suitability check, and real integrations.
- Anything touching `main`.

## Success criteria

- The ten-second test: on any thread, it is obvious in plain words who will read the next message.
- No system jargon remains in the advisor's path.
- The flagship rebalance visibly catches and records the suitability gap.
- Clients are told the truth about who reads their messages.
