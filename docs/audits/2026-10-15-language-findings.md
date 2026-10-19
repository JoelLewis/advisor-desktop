# Advisor Desktop: language and content critique

Deployed app at `e932a0b` (workspace branch), read as an RIA advisor, CCO or operations lead would read it. The full visible text plus off-screen accessible names was captured for 59 states: every route in its fresh state, every step of the README path, the `?` sheet, the command line, and View as Robert, Dr. Pell and Mark (fresh and at the end). Captures are in `critique2/out/`, with shell chrome stripped in `critique2/b2/`. The harness is in `critique2/*.spec.ts`. No code was changed.

**Headline.** The domain substance is very good. The wash-sale handling, the rollover caution, the disclosure timing, the onboarding checklist and the meeting transcript all read like a real practice. What makes it feel like "a clever concept" is mostly a layer of invented system vocabulary on top of that substance: *binding act, reading, carried, take to, desk, full view, fingerprint, MAY / MAY NOT, moved book, the engine*. The app also uses three separate vocabularies for visibility. An advisor has to decode the product before they can see the practice in it.

---

## 1. Glossary: current term → advisor's word

| Current term | What it means here | Advisor's natural word | Where |
|---|---|---|---|
| **Thread** | A workspace conversation about one subject | "conversation", "workspace", "case", or keep "thread" (Slack-familiar) but never say it alone in client copy | Thread list, "Open the meeting thread", "Open her thread", "Back to the thread" |
| **Take to ▾** / **Take to team thread** | Send a finding or row into another conversation | "Share to…", "Send to…", "Discuss with team" | Every Brief finding; every row of Billing, Practice, Models, Risk, Reconciliation, Blotter |
| **carried by** / "Carried from the Brief" | The finding was forwarded | "Shared from the Brief by Adrian Hale" / "Forwarded by" | Johnson Review card header; aria-label (`CarriedFindingView.tsx:28`) |
| **Binding act** / "· BINDING" | A recorded, append-only action | "Recorded action", "Audit record", "Sign-off". "Binding" is wrong for a delivery or a message (see §2) | Context section "BINDING ACTS"; every record slip ("APPROVE PROPOSAL · BINDING"); dialogs ("Delivery is a binding act") |
| **Records** (client view) | Same thing, from the client's side | "Documents & confirmations" | `ActsPanel.tsx:17` |
| **Reading** / "pre-trade reading" / "Shared the drift reading" / "the readings below" | A measured result | "results", "check results", "drift report" | Approval checkbox, presenter rationale (`presenter.ts:12`), workbench feed (`CompactMessage.tsx`), Meeting Prep |
| **Desk** / "Agents on this desk" | Firm-wide pages / the agents available | "Firm" / "Tools"; "Your assistants" | Thread list group headers |
| **Reference** | Book-level reports | "Reports", "Book", "Practice management" | Thread list |
| **Full views** / "Open full view" ↗ | Links to account, household or client pages | "Related records", "Open account" | Context column (`FullViews.tsx`), drift embed |
| **Thread context** / **Live thread** / **Household reference** | Labels for the side column | One label: "Details" (thread) / "Conversation" (workbench, meeting) | `routes.tsx:24,26,30`, `MeetingPage.tsx:94` |
| **Fingerprint** | A content hash of what was approved | "Version hash" or "Document ID". Hide it behind "Audit details" | Record slips, workbench header, archive column, recap footer |
| **MAY / MAY NOT** | The agent's permitted scope | "Can / Can't" or "Does / Won't" | Agent cards in the thread list and the context column (`AgentScope.tsx`) |
| **moved book** | Holdings after today's fills | "updated holdings", "post-trade" | Meeting Prep claim (`meeting-prep.ts:53`), README step title |
| **the value the engine states** | Total ties to the system value | "Total" / "ties to custodian value" | Household and client totals (`AccountsTable.tsx:31`) |
| **ties to Σ…** | A reconciliation check on the totals | "Total" (accountants don't write Σ) | Billing, Practice |
| **Est. tax added to the return** | Incremental tax on the tax return | "Est. additional tax" / "Est. tax impact" ("return" reads as investment return) | Proposal embed (`TaxReadings.tsx:15`) |
| **pooled-vehicle limit** | The firm's 35% single-fund limit | "single-fund concentration limit" | Pre-trade WARN (`compliance.ts:116`) |
| **Wash-sale taxpayer** (pane title) | Restrictions scoped to the taxpayer | "Wash-sale restrictions (household taxpayer)" | `WorkbenchSummary.tsx:42` |
| **No buy-back to** / no repurchase through / restricts buying it back through / "until its window closes" | One concept, the wash-sale repurchase window | "Don't repurchase until [date]" (one phrasing) | `WorkbenchLegs.tsx:35`, `RestrictionList.tsx:16`, `harvest-scanner.ts:96` |
| **Staged** (orders) vs **Staged sale** (Stryker) | (a) orders awaiting release; (b) a sale spread over tax years | (a) "Pending release"; (b) "Phased sale" / "Sell over two tax years". Same word, two meanings | Approval panel "Staged, not released"; `ReviseProspectDialog.tsx:26` |
| **Disposition / Disposed today / Dispose alert** | Compliance closed an item | "Disposition" is real FINRA usage, but "Disposed today" reads as disposal. Use "Closed today" / "Reviewed today" | `SupervisionQueue.tsx:36` |
| **Hold the meeting** | Demo time-skip to after the meeting | "Demo · skip to after the meeting" / "Mark as held" | `MeetingControls.tsx:59,69` |
| **Clock** / "Advance to her reply" / "on a clock jump" | Demo time-skip | Fold under the "Demo ·" label already used for Mark | Pell context column (`ProspectClock.tsx:52`), record slip |
| **Run prep** | Ask Meeting Prep | "Prepare meeting" | Meeting panel |
| **Drop** (agenda) vs **Remove** (notes) | Delete an item | "Remove" in both places | Agenda editor vs notes |
| **Command line** / "Go to" / "This key sheet" / "Main" | Quick navigation, the shortcuts sheet, the main pane | "Search / Go to", "Keyboard shortcuts", "Conversation" | `KeySheet.tsx:18-19`, `WorkspaceShell.tsx:42` |
| **Brief** | Morning dashboard | "Morning brief" / "Today". Works, but a newcomer can't tell it's a page | Thread list |
| **OUT / AT LIMIT / IN** | Drift band status | "Outside band / At band edge / Within band". The household table already says "OUTSIDE ITS BAND" right next to OUT | Drift tables everywhere |
| **Workbench** | Proposal editor | "Edit trades" / "Trade editor". OK once learned | Proposal embed |
| **best-interest record** | Recommendation rationale | Fine for the rollover and Reg BI flavor. For an RIA the usual phrase is "recommendation rationale" or "fiduciary documentation" | Pell approval |

---

## 2. Inconsistencies (one concept, several names)

### Visibility: three vocabularies plus a visual code
- Thread list group headers: **PRIVATE / INTERNAL / CLIENTS AND PROSPECTS** (`ThreadList.tsx:17-19`).
- Legend: **Only you / Firm only / Shared with the client or prospect** (`VisibilityLegend.tsx:5-7`).
- Per-thread caption: **Only you / Firm only · client can't see / CLIENT CAN SEE** (`kit/visibility/visibility.ts:15-17`). The client caption is shouted in capitals while the other two are sentence case, and it reads as third person.
- Client view: **Shared with you and your advisor** (Robert) vs **Shared with you and the firm** (Pell), plus "YOUR CONVERSATION" (`VisibilityLegend.tsx:23`, `ThreadList.tsx:23`). Robert still sees the caption "CLIENT CAN SEE" about himself.
- **Accuracy issue.** Robert is told "you and your advisor", but WHO CAN SEE lists Sarah Mitchell too, and the firm view shows that Mark Davis (compliance) reads the thread. The client's own list leaves Mark out. A CCO will flag this: client communications are supervised, and the client-facing text should not imply otherwise. Say "Shared with you and the Larkfield team (messages are retained and may be reviewed by compliance)."
- "Firm only · prospect can't see" on "Pell · prospect work" next to "Firm only · client can't see" on everything else, including firm-wide reference pages such as Billing. On Billing, "client can't see" implies some client might be able to.
- The dashed / hatched / solid band (`visibility.ts:5-10`) is a code a newcomer has to learn. The words carry the meaning, so the band is decoration and not a signal.
- The transcript in the meeting view carries a bare "Firm only" label. Record slips say "Archive: Supervisory review" (firm) vs "Archive: Retained as a record" (client) (`act-kind-label.ts:26-32`).

### Client / household / account
- One household under four names: "Johnson Household", "Household · Johnson", "Johnson", and the meeting "Annual Review — Johnson Household".
- One meeting under three names: "Johnson annual review" (thread), "Annual Review — Johnson Household" (meeting card), "Meeting · Johnson annual review" (link).
- Thread titles are cased three ways: "Johnson Rebalance Review" (title case), "Johnson annual review" (sentence case), "Pell · prospect work" / "Risk · Patel Digital Assets Account" (dot-separated).
- "Johnson Family Trust" vs "Johnson Trust" (Supervision alert comp-002).
- "Pell · prospect work" is also called "her internal thread" (coffee dialog) and "the prospect work thread" (coffee confirmation).
- Internal IDs show in professional copy: `acc-002`, `rs-001`, `ha-001`, `doc-001`, `comm-014`, `plan-001`, `stg-0001`, `bex-002`, `brk-002`, `comp-001`. Screen readers hear "Edit n-01" / "Remove n-01" on note lines. Advisors use account nicknames and last-4 numbers.

### Proposal / version / draft
- "Proposal · Johnson rebalance", "Johnson rebalance v3", "v3 of the Johnson rebalance", "the Pell proposal", "the prospect proposal", "Staged from v3", "Legs · draft", "DRAFT · NOT SAVED", "SHOWING V2". The word "draft" also means a client letter ("Draft · not sent", "DRAFTS FOR ROBERT").
- "Legs" is trader jargon. Advisors say "trades".

### Approve / release / disposition / accept
- Approve (advisor) → "Staged, not released" / "PENDING COMPLIANCE REVIEW" / "Orders awaiting release" / "Pending compliance" (blotter filter) → "Release orders" / "Released for execution" / "Released by compliance" → FILLED. That is four phrasings of one waiting state.
- Approval attestation differs between flows: "I reviewed every leg of v3 and its pre-trade reading." vs "I reviewed v2: its model, its transfer plan, its fees and the best-interest record."
- Blocker hint differs: "Confirm your review above to approve." (`approve-blocker.ts:5`) vs "Tick the review of v2 first." (`ProspectApproval.tsx:32`).
- Johnson approval has no confirm dialog. Pell approval does ("Approve v2 of the Pell proposal?").
- Archive "Kind" filter lists both "Send to client or prospect" and "Sent message". Each send appears twice (REC-0004 twice, REC-0007 twice), so "11 of 11 records" covers 9 acts.

### Composer
- Firm threads: "Message / Post". Client thread as advisor: "Draft / Save draft". Client thread as client: "Message / Send".

### Dates and time
- The app shows "27 Mar 2026"; the client letter shows "March 27, 2026". US advisors write "Mar 27, 2026".
- The weekday appears in some places but not others: "Wed 25 Feb 15:23 ET" (Pell timeline) vs "25 Feb 15:23 ET" (record slip).
- "born 1958-03-22" (ISO) appears in a Meeting Prep citation; elsewhere it's "22 Mar 1958".
- REC-0003 is filed at 15:17 ET in the Archive but its record trail line says 15:18 ET (`b2/23-path-meeting-filed.txt:273` vs `b2/48-path-end-archive.txt`).
- The blotter header still says "as of 25 Feb 07:00 ET" while it lists fills at 09:30–09:34 (`/blotter` after release).

### Demo framing
- Three demo devices with three labels: "Demo · act as Mark Davis" (clearly labelled), "CLOCK · Record the coffee · Advance to her reply" (not labelled demo), "Hold the meeting" (not labelled demo). Pell's acceptance slip says "Demo · a scripted step, run by Adrian Hale on a clock jump"; the Archive says "via a scripted clock jump".
- Home says "the date is frozen at 25 Feb 2026" (`WorkspaceHome.tsx:30`). After step 6 the Brief reads "TODAY · MON 2 MAR", still lists "25 Feb 14:00–15:15 ET Johnson annual review · filed" under Today, and still says the AGG loss "can be sold at a loss today" as of 25 Feb. The reconciliation break is resolved on 2 Mar.
- Product copy carries demo instructions: Supervision says "Orders appear here once an advisor approves a proposal (Johnson Rebalance Review → Approve)." (`SupervisionQueue.tsx:32`). Reconciliation shows "Before this session".

---

## 3. Domain accuracy and tone

**Right, and impressive to a practitioner.**
- Wash-sale scope: spouse and IRAs included; a loss washed in an IRA is permanently disallowed; the employer-plan question is called "unsettled" and handled as firm policy; reinvested dividends count as buying; the 30-day windows are computed correctly (20 Feb → 22 Mar, 25 Feb → 27 Mar).
- SECURE 2.0 age 73 for someone born in 1958.
- Interval-fund "periodic repurchase windows".
- Form CRS and ADV 2A/2B timing is labelled as firm policy, not as the rule.
- Onboarding: CIP, OFAC, trusted contact under FINRA 4512 on the custodian form, ACAT.
- The 403(b) rollover is "asked about; comparison to follow" with no recommendation (DOL PTE 2020-02 instinct).
- The tiered fee arithmetic (0.99% blended on $2.1M = $20,850) and billing in advance vs in arrears.
- Transcript dates resolve correctly ("this Friday" = 27 Feb, "next Wednesday" = 4 Mar).

**Questionable.**
1. **The demo contradicts itself on suitability.** Robert is "Moderate · score 55" (client page). The Risk view flags his Individual account "ABOVE TOLERANCE +34 pts". Yet the Brief, the Proposal Agent and the approval rebalance him *toward Growth* (Moderate Aggressive) without a word. A CCO will see this first. Either the seed should make Growth fit, or the proposal should surface the mismatch.
2. **"Binding" is used for acts that bind no one.** Delivering Form CRS, sending a letter and a prospect's chat "I'd like to go ahead" are all labelled "· BINDING". Her "ACCEPT PROPOSAL · BINDING" sits next to an advisory agreement that is "AWAITING HER SIGNATURE". The contract binds; the chat message does not. Use "Recorded" for everything and keep "approval" and "release" as the only sign-offs.
3. **Compliance releasing each rebalance before execution** is unusual for an RIA. Trade review is normally post-trade or exception-based. It is plausible as a stated firm policy, but nothing in the UI says "firm policy" here, as it does for CRS.
4. **"pooled-vehicle limit" of 35% on SPY.** Concentration limits rarely bind a broad index ETF. A single-issuer limit, or naming the mandate's own rule, would land better.
5. **Brief scope.** The "morning brief" for a 47-account, $91M book covers one account (Robert Johnson Individual). Decision item 1 ("Drift Monitor · OUT · US Equity is outside its tolerance band") doesn't say whose account.
6. **Agenda order.** Meeting Prep leads the client's annual review with "Wash-sale windows: what not to buy back". An advisor would open with goals and the plan; tax mechanics come later.
7. Seed slips: Robert's communications mention "selling concentrated AAPL position", but he holds no AAPL. The AML alert cites BSA/AML documentation "before funds release"; RIAs aren't yet covered by FinCEN's adviser rule (delayed to 2028), and funds release is the custodian's job. "Johnson Family Trust" shows owner "Robert Johnson" without saying revocable or irrevocable, which matters for the wash-sale taxpayer logic the README highlights. "Aggressive Growth" at 80% equity sits barely above "Growth" at 75%.
8. **The fee line in the Pell letter.** "the fee moves with the account's value" is fine. But the letter also explains the 31.8% collectibles rate on "physically backed precious-metal funds" to someone who holds none. That is boilerplate over-hedging.

**Tone: stiff or robotic spots, worst first.**
- **Client recap** (`meeting-recap.ts:37-38`, `meeting-notes.ts:30`):
  - "Dear Robert, Thank you both…": it is addressed to one person and thanks two. It should be "Dear Robert and Patricia".
  - "You will not buy Intel…" reads as an order. Better: "Please don't buy Intel… until 27 March."
  - "What you asked us: Model Roth conversion amounts…" is an imperative aimed at the client. Better: "We'll model…".
  - "A rollover … was asked about; comparison to follow." is passive and cold.
  - "This is an estimate; consult your tax professional. We will involve your CPA." gives two contradictory instructions in one bullet.
- **Pell proposal letter** (`prospect-proposal-agent.ts:65`): "This is our proposal." and "Portfolio: Growth, our model for your answers:" read like a form. It has no sentence about her goals or why we fit. For a first proposal to a referred physician with $3M, this is the most important client-facing text in the app.
- **The "no digits in agent claims" rule produces contortions.** "Required distributions … begin in the year the citation states" (`meeting-prep.ts:172`). "the readings below are of the moved book." The guardrail is clever. The copy it forces is not.
- **Agent scope lines.** "Transfer-In MAY read her statements · set moving each holding in kind against selling it" (`people.ts:25`): "set … against" is ungrammatical, and "her" is wrong on a firm-wide agent card. "Meeting Prep MAY measure the household" is also odd.
- **Philosophy copy.** "The workbench never approves. Approval is a recorded act in the thread." "Sending is recorded as a binding act by you." (`DraftsPanel.tsx:119`). "nothing executes until compliance releases it" uses "it" for orders and should be "them" (`SupervisionPage.tsx:52`).
- **Over-hedging.** The same tax caveat appears up to three times on one card ("an estimate at the top federal rate; state tax not modeled; consult your tax professional"), and again in the footers.
- **"N of N" table footers.** "0 of 0 disclosures" under "No disclosures.", "1 of 1 window", "2 of 2 goals" add noise where nothing is filtered.

**Fictional plausibility.** Names, figures and dates are credible: Larkfield, Adrian Hale, the Johnson household at $18.75M, Chen-Wong, a Stryker position with low basis from early in her career, TIAA 403(b) "— University", fills at 09:30 ET. The one strain is Pell's pace: statements at 09:12, proposal approved at 09:21 and sent at 09:23. Real firms take days. Say it's compressed, or let the clock jump cover it.

---

## 4. Top 10 copy changes, ranked by impact

1. **One visibility vocabulary, in plain words, and honest to clients.**
   - Firm side: **Just me / Larkfield team / Shared with Robert** (name the person).
   - Client side: **"You and the Larkfield team · retained and reviewed by compliance."**
   - Drop PRIVATE/INTERNAL and the capitalised "CLIENT CAN SEE"; group headers become **My notes / Team / Client conversations**.
   - Files: `visibility.ts:13-18`, `VisibilityLegend.tsx:5-23`, `ThreadList.tsx:17-23`.
2. **Retire "binding".** Use "Record" or "Recorded" for every act and keep "Approval" and "Release" as the named sign-offs. Re-word "ACCEPT PROPOSAL · BINDING" to "Proposal accepted (agreement pending signature)". Context heading "Binding acts" → **"Audit trail"**. Files: `act-kind-label.ts:26`, `ActsPanel.tsx:17`, `DisclosureTimeline.tsx:41`, `DraftsPanel.tsx:119`.
3. **Rewrite the two client letters in an advisor's voice.**
   - Salutation to both spouses; "Please don't buy Intel until March 27"; "We'll model Roth conversion amounts and share them with your CPA."
   - Pell: open with her goals and the Stryker concern, and keep the figures. Drop the collectibles sentence.
   - Files: `meeting-recap.ts:37-38`, `meeting-notes.ts:30`, `prospect-proposal-agent.ts:65`.
4. **Fix the suitability contradiction.** Robert's Moderate (55) profile vs the Growth model, which Risk flags. Either change the seed or add a pre-trade or proposal line that says so. It's content, but it's the first thing a CCO reader will catch.
5. **Swap the system nouns for practice nouns.** Take to → **Share to**; carried by → **shared by**; reading → **results/check**; Full views → **Related records**; moved book → **updated holdings**; Thread context → **Details**; Desk/Reference → **Firm/Reports**; MAY / MAY NOT → **Can / Can't**.
6. **Label all demo devices the same way.** "Demo · skip to after the meeting", "Demo · skip to her reply (Thu 26 Feb)". Put the CLOCK pane under the "Demo ·" heading. Remove "(Johnson Rebalance Review → Approve)" and "Before this session" from product copy. Make the home line true after the clock moves: "Starts frozen at 25 Feb 2026; the presenter can move it forward."
7. **One phrase for the wash-sale window.** "Don't repurchase until 27 Mar 2026" in the workbench column, the restriction list, the agent citations and the letter. Rename the pane "Wash-sale taxpayer" to "Wash-sale restrictions".
8. **Disambiguate "staged".** Orders: "Pending compliance release". Stryker: "Phased sale over two tax years". Settle on one waiting-state label in the panel, Supervision and the blotter filter.
9. **Hide audit plumbing by default.** Fingerprint, UTC, Record ID and internal IDs (acc-002, rs-001, ha-001, brk-002, stg-0001, n-01) go into an "Audit details" disclosure. Accounts read as "Robert Johnson · Individual (…0021)". Above all, don't show fingerprints to prospects.
10. **Fix the small contortions forced by guardrails.** "the year the citation states" → "in 2031 (age 73)", stating the figure through the kit. "the value the engine states" → "Total". "Est. tax added to the return" → "Est. additional tax". "pooled-vehicle limit" → "single-fund limit". "Disposed today" → "Closed today". Agent scope grammar ("set moving each holding…"). Agenda "Drop" → "Remove". Key sheet "Main" → "Conversation".

---

## 5. What already reads well

- **The meeting transcript and filed notes.** The dialogue is natural, every note cites its transcript line, follow-ups carry real owners and due dates, and "no recommendation was made" on the rollover is exactly right.
- **The wash-sale explanations.** "a buyback in a taxable account would defer the harvested loss into the new shares, and one in an IRA or Roth would disallow it permanently" is precise and plain, and the held-away caveat is honest ("the rule for employer plans is unsettled").
- **"Firm policy:" labels** on CRS and ADV timing, and "(firm policy)" in the Brief. They are accurate and teach the reader something.
- **Billing and Reconciliation.** Methods & sources is clear, the "Custodian says" column and the exceptions narratives are good ("the custodian's fee file still lists her as billed in advance. Correct the custodian file before the April run."), and in advance vs in arrears is explained properly.
- **The best-interest alternatives** ("Considered Balanced Growth… Staying self-directed · 0 USD a year… the fee of $20,850 a year pays for that advice") and "Why this recommendation (your words)".
- **Onboarding checklist wording**: CIP, OFAC, trusted contact (custodian form, FINRA 4512), ACAT, and "receipt signed with the agreement".
- **Refusals and empty states that explain themselves**: "You can read this thread but not post in it.", "Record the coffee first; her reply follows it.", "Dr. Amanda Pell can't see Supervision; showing the workspace.", "File the record of the Johnson annual review first."
- **The presenter shortcut** is honestly labelled ("Demo · act as Mark Davis … marked as made through this shortcut") and the label carries through to the record and the Archive. Use it as the model for the other demo devices.
- **The home page's opening line**: "agents measure the book, the advisor decides, compliance releases, and each client sees only what is theirs" says the whole concept in one sentence.
