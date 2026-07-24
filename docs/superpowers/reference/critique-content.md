# Advisor Desktop — content, voice & narrative critique

Judged against `design-system-brief.md` §2 (Content fundamentals) and rules 18–32 of §10.
Scope: rendered UI copy, mock data that renders as copy, formatting utilities, README, demo self-presentation.

**Findings by severity**

| | count | what it covers |
|---|---|---|
| **Critical** | 7 | internal number/date incoherence; ~830 Title Case strings; no mock-data disclaimer; guided tour in vendor voice; past-performance claim in a client proposal; 13 silent mutation failures; unmasked account numbers and tax IDs |
| **High** | 18 | formatting utilities (minus sign, compact precision, date format, weight vs return precision); 16 errors with no next step; guide named 5 ways; nav/page/annotation names disagree on 9 pages; README factually wrong incl. npm-on-pnpm; first-person AI outside chat; compliance blocks with no remediation path |
| **Medium** | 31 | 33 shipped emoji; date-format setting that does nothing; `formatPercent` signing fee rates; hardcoded `$` bypassing reporting currency; 8 wizard steppers disagreeing with their panels; abbreviation applied at random; no helper text in settings; hardcoded/fabricated deltas; hardcoded green growth column |
| **Low** | 22 | 16 placeholders echoing their labels; 14 bare empty states; "successfully" filler ×5; `Concept v1`; shields.io badges; raw snake_case field names; `85m` for 85 minutes |
| **Total** | **78** distinct findings | ~1,100 individual strings affected |

---

## 1. Verdict

**The engineering is a 9. The product copy is a 7. The copy the demo writes *about itself* is a 4.**

That split is the finding. Someone wrote the in-product strings with real domain fluency — the NBA
descriptions (`Margaret Chen sold NVDA at a loss on Feb 10. The 30-day wash sale window closes Mar 12.
Her model targets 5% NVDA weight — do not repurchase until window expires.`) are exactly the
"state the finding, then the action" shape §2 asks for. The suggested AI prompts, the notification
bodies, and most NBA titles are already sentence-case, quantified, unhyped. There is **zero emoji in
rendered UI copy**, **one** exclamation mark in-product, and almost no marketing register anywhere in
the working surfaces. That is genuinely rare and it should be said plainly.

Three things break it.

**Gap 1 — the demo's own voice is the worst-written text in the repo.** Every hype word in the
codebase lives in `annotation-config.ts`: *"10x faster than handling individually"*, *"like having a
junior analyst watching over your shoulder"*, *"Instant Client Search"*, *"Real-Time Drift Monitor"*,
*"Smart Order Summary"*, *"in under two seconds"*, *"360°"*. The guided tour is the one surface where
a professional audience is explicitly evaluating your judgement, and it is written in vendor-datasheet
voice while the product it is annotating is written in fiduciary voice. The annotation layer
currently *undermines* the thing it is pointing at.

**Gap 2 — the demo does not agree with itself about the numbers.** On one screen the book is
`$91.3M`; in the AI chat panel it is `$847M AUM across 42 households`. The metrics bar says
`PENDING TASKS 14`, the insight card directly beneath it says `20 pending actions identified`, and the
link says `View all 20 actions`. The insight headed `2 Critical Actions Require Attention` has a body
reading `3 time-sensitive items detected`. `NET FLOWS MTD $1.3M` sits above `Net inflows this month:
+$420K`. And the app's idea of "today" is `Friday, July 24, 2026` in the page header, `Wednesday,
Feb 25` in the schedule panel two inches to the right, `02-27` on the reconciliation chart, and
`Mar 12` in the NBA deadlines. For a wealth-management surface whose entire claim is numeric
precision, this is the credibility killer. An advisor or a fintech PM will spot it inside 30 seconds.

**Gap 3 — casing.** ~580 Title Case strings in application code, plus ~250 more in mock data that
render as labels. Rule 18 says Title Case never appears. It is mechanical to fix and it is the single
highest-leverage change available.

There is a fourth thing that sits underneath all three, and it is the one I would fix first if only
one thing could change: **the app asserts where it should hedge.** The compliance register is the
part of §2 with the most riding on it, and the app has no compliance register at all. The strings
`net of fees` and `gross of fees` appear **zero times** in the codebase. `'All compliance checks
passed. Ready to execute.'` is an unhedged green light. `HarvestScannerView.tsx` applies a 37% top
marginal rate to every client and calls the output `Est. Tax Savings`. And
`mocks/data/proposals.ts:51` puts *"which historically outperforms over 15+ year horizons"* into a
client-facing proposal — which in a real firm is not a copy note, it is a finding. A wealth
professional will read that line and stop reading the rest.

Under that: the numbers themselves are formatted to a looser standard than the brief demands
(`$91.3M` not `$91.21M`, hyphen-minus not `−`, `Jul 24, 2026` not `24 July 2026`, account numbers
fully unmasked as `TRU-847291`), the README describes a different app than the one that ships (20+
pages vs 27, 130+ endpoints vs 175, `npm install` on a pnpm repo), and **nowhere in the running app
does it say the data is fictional** — which, in a demo full of named "clients", dollar balances and
compliance language, is the one disclaimer that is genuinely load-bearing.

---

## 2. Voice violations

### 2a. Hype adjectives, salesy register, product self-praise (rule 28)

Concentrated almost entirely in the guided-tour layer.

| file:line | current copy | violation | rewrite |
|---|---|---|---|
| `src/features/annotations/annotation-config.ts:79` | "One click processes all affected accounts together — **10x faster** than handling individually." | 28 — unsubstantiated multiplier | "One click processes every affected account in a single pass. Each account still produces its own trades and its own compliance record." |
| `annotation-config.ts:154` | "The AI proactively flags risks before you submit an order — **like having a junior analyst watching over your shoulder.**" | 28 + 29 — simile + anthropomorphism | "Pre-trade checks run as the ticket is filled: wash-sale window, concentration limit, restricted list. Failures block submission." |
| `annotation-config.ts:390` | title: "**Instant** Client Search" | 18 + 28 | "Client search" |
| `annotation-config.ts:393` | "advisors can locate any client in their book **in under two seconds**" | 28 + 30 — invented performance claim | "Search filters on name and email as you type, and combines with column sort." |
| `annotation-config.ts:488` | title: "**Real-Time** Drift Monitor" | 18 + 28 (the data is mock; nothing is real-time) | "Drift against target" |
| `annotation-config.ts:192` | title: "**Smart** Order Summary" | 18 + 28 | "Order summary" |
| `annotation-config.ts:17`, `:65`, `:479` etc. | pageDescription: "The advisor's morning **command center** — AI-prioritized actions, live metrics, and **contextual intelligence** in one view." | 28 — three buzz nouns in one line | "What needs attention this morning: practice metrics, the scored action queue, today's schedule." |
| `annotation-config.ts:126` | "A **360°** client view with embedded AI intelligence" (×3 uses of "360°") | 28 — sales-deck cliché | "Every account, plan, document and interaction for one client on a single page." |
| `annotation-config.ts:132` | "**Eliminates** context-switching between CRM and workflow systems." | 30 — promised outcome | "Starts the workflow with this client's data already populated." |
| `annotation-config.ts:87` | "'Delegate' **hands off to the AI**" | 29 — AI as agent-entity | "'Delegate' assigns the action to an autonomous agent under your standing rules." |
| `annotation-config.ts:106` | "Closes the loop: **the AI learns from advisor behavior** to improve future prioritization." | 29 + 30 — capability claim not demonstrated | "Acted-on rate, time-to-action and dismissal reasons feed back into the scoring weights on the NBA settings tab." |
| `AnnotationPanel.tsx:17` | `smart_workflows: 'Smart Workflows'` | 18 + 28 | `smart_workflows: 'Workflow depth'` |
| `AnnotationPanel.tsx:15-18` | `'Embedded AI'`, `'Actionable UX'`, `'Batch Actions'` | 18 | `'Embedded AI'` → `'AI in the workflow'`; `'Actionable UX'` → `'Direct action'`; `'Batch Actions'` → `'Batch operations'` |
| `annotation-config.ts:169` | "The model trade **multiplies efficiency**: one decision propagates to dozens of accounts." | 28 | "One model change generates per-account trades for every account assigned to that model." |
| `annotation-config.ts:429`, `:322` | "**essential** for capacity planning" / "**essential** for time allocation" | 28 | delete the clause; the sentence before it already carries the point |
| `src/mocks/handlers/ai.ts:461` | "achieved 82% open rate — **significantly** above the 68% average" | 28 — statistical word used loosely | "82% open rate against a 68% book average, over 340 sends. Sample is small; treat as directional." |
| `src/mocks/data/ai.ts:419` | "Find **optimal** meeting time and generate agenda" | 30 — promises optimality | "Propose meeting times from open calendar slots and draft an agenda." |
| `src/mocks/data/ai.ts:211` | "Create **comprehensive** tax-loss harvesting report" | 28 | "Generate a tax-loss harvesting report across the book" |
| `src/mocks/data/ai.ts:405` | "AI-draft a **professional** email to a client on any topic" | 28 | "Draft a client email; tone and signature come from AI settings." |
| `src/mocks/data/nbas.ts:221` | "A partial Roth conversion of $150K could save **significant** taxes over 10+ years." | 28 + 30 — unquantified benefit | "A partial Roth conversion of $150,000 at his projected 2026 bracket is estimated to save $41,000 in lifetime tax, before state tax. Estimate only." |
| `src/mocks/data/nbas.ts:110` | "**High-touch clients value personal gestures.**" | 28 — editorialising platitude | "Platinum tier service standard includes a personal contact within 3 days of a birthday." |
| `src/mocks/data/nbas.ts:7` | "Batch rebalancing **can save ~40 minutes** vs individual trades." | 30 — outcome promise, no basis | "Batch rebalancing submits all seven as one reviewed block; each still produces its own trade file." |
| `src/mocks/data/proposals.ts:51` | "…maximizes exposure to domestic large- and mid-cap growth, **which historically outperforms over 15+ year horizons.**" | 30 — **past-performance-implies-future claim in a client-facing document.** This is the single worst string in the repo; in a real proposal it is a regulatory finding, not a style note | "…concentrates exposure in domestic large- and mid-cap growth. Past performance does not indicate future results." |
| `src/mocks/data/proposals.ts:171` | "The following allocation is designed to **optimize your risk-adjusted returns**…" | 30 — outcome promise | "The following allocation targets the risk band agreed in your Investment Policy Statement. Projections are estimates and are not guaranteed." |
| `src/features/portfolios/account-detail/OverviewTab.tsx:170` | "Sharpe ratio of {n} indicates **{'strong' \| 'moderate'}** risk-adjusted returns." | 28 + 30 — qualitative verdict from one number, threshold (1.2) invisible | "Sharpe ratio {n}, against a 0.95 peer median. Trailing 3 years, gross of fees." |
| `OverviewTab.tsx:168` | "This account has **drifted beyond threshold and should be rebalanced**." | 30 — advice stated as fact, no as-of | "Drift is {x}%, beyond the ±3.0% band. Last rebalanced {date}." |
| `OverviewTab.tsx:169` | "Unrealized gains of {n} — **consider tax-loss harvesting opportunities** in underperforming positions." | 30 — recommends a tax action with no disclaimer | "Unrealized gain {n} as of last close. {m} positions currently hold short-term losses." |
| `src/features/portfolios/rebalance/ComplianceReviewStep.tsx:140` | "All compliance checks passed. **Ready to execute.**" | 30 — an unhedged green light; passing checks is not a suitability determination | "All automated checks passed. Suitability remains your determination." |
| `src/features/portfolios/trade-fields/ComplianceCheck.tsx:27` | "All compliance checks passed" | 30 — same, second location | "Automated checks passed" |
| `src/features/portfolios/tax/HarvestScannerView.tsx:36`, `:98` | "Estimated tax savings: {n} **(at 37% rate)**" — and the per-row figure at `:98` hard-codes `* 0.37` with no label at all | 30 — top marginal rate applied to every client | "Estimated tax saved: {n}. Assumes a 37% federal marginal rate; actual rate varies by client. Not tax advice." — and surface the assumption on every row, not just the header |
| `src/features/billing/BillingPage.tsx:172`, `:196` | "**Save** {n}**/yr**" | 30 — savings stated as fact, and `:196` pipes the same unhedged claim into an AI prompt that drafts client-facing text | "Estimated fee reduction {n} per year at the next breakpoint, based on current AUM." |
| `src/features/growth/BookOfBusinessPage.tsx:248-251` | "**Well-diversified practice. Low concentration risk.**" / "High concentration. **Revenue at risk from attrition.**" | 30 — forward-looking risk verdict from a single HHI figure | "HHI {n}. Top 10 households are {x}% of AUM, as of {date}." — state the measure, let the advisor conclude |
| `src/features/growth/ProspectsPage.tsx:151`, `:156` | `Win Rate` / `Pipeline Velocity` | 30 — a projection labelled as a measurement; no denominator or period disclosed | `Win rate (trailing 12M)` / `Projected pipeline velocity` |
| `src/features/settings/NBASettingsTab.tsx:343` | "**Live** Ranking Preview (Top 10)" | 28 — nothing is live; it is a local recompute | "Preview — top 10 with these weights" |
| `src/features/settings/autonomy/DelegationRulesCard.tsx:146` | "Matching tasks are **automatically routed.**" | 30 — automation guarantee with no failure case | "Matching tasks route automatically. Anything that fails a permission check is held for your review." |
| `src/features/proposals/steps/FinalizeStep.tsx:40` | "The proposal has been finalized and is **ready for client presentation.**" | 30 | "Proposal finalized and archived. Compliance review is recorded against it." |
| `src/features/compliance/ArchivePage.tsx:153` | "**Immutable** archive of **all** AI-generated documents" | 30 — two absolute claims in one subtitle | "AI-generated documents held under SEC 17a-4 WORM retention, with advisor disposition." |

**"Successfully" as filler** — 5 toasts (`CampaignDialog.tsx:56`, `ComposeEmailDialog.tsx:74`, `LogCallDialog.tsx:65`, `QuickTaskDialog.tsx:62`, `StartWorkflowDialog.tsx:61`). `'Campaign created successfully'` → `'Campaign created'`. The success is implied by the toast being green; the adverb is doing no work.

### 2b. Exclamation marks (rule 28)

Only two in-product. Both should go.

| file:line | current copy | rewrite |
|---|---|---|
| `src/mocks/handlers/settings.ts:17` | `defaultGreeting: 'Good morning! Here\'s your daily briefing.'` | `defaultGreeting: 'Here is your briefing.'` — also removes the time-of-day assumption, which is wrong for anyone loading the page after noon |
| `src/mocks/handlers/nba.ts:231` | "Wishing you a **wonderful birthday! I hope you have a fantastic celebration.**" | "Wishing you a happy birthday. I hope the year ahead goes well." — this is client-facing outbound so warmth is allowed, but two exclamation-grade superlatives in one sentence is not the register a fiduciary sends |
| `src/mocks/handlers/nba.ts:262` | "Thank you for the kind **referral!** " | "Thank you for the referral. " |

### 2c. Product / AI speaking in first person (rule 29)

~30 occurrences, all in `src/mocks/data/ai.ts` and `src/mocks/handlers/nba.ts`.

There is a defensible line here and the app is on the wrong side of it. A **conversational chat turn**
in first person is a genre convention and I would leave it. An **insight card**, an **action
description**, or an **NBA body** is the interface speaking, and rule 29 applies without exception.
Right now the same first-person voice runs through both, which is why it reads as an anthropomorphised
product rather than an instrument.

| file:line | current copy | violation | rewrite |
|---|---|---|---|
| `src/mocks/data/ai.ts:30` | "…up from 2 last month. **I recommend prioritizing** the rebalancing queue." | 29 | "…up from 2 last month. The rebalancing queue is the highest-value place to start." |
| `src/mocks/data/ai.ts:67` | "**I recommend** a gradual reduction over 3-4 months to manage tax impact." | 29 | "A gradual reduction over 3–4 months limits realised gains. Estimated tax impact is $42,000 if sold in full today." |
| `src/mocks/data/ai.ts:132` | "**I see** some opportunities across your book today… **Want me to** generate trade suggestions?" | 29 + register | "Two items across the book today: 4 accounts beyond their rebalancing thresholds, and $18,600 in harvestable losses in the Chen-Wong taxable account. Generate trade suggestions?" |
| `src/mocks/data/ai.ts:145` | "**I'm your AI assistant. I can help with** portfolio analysis, rebalancing recommendations…" | 29 — chatbot boilerplate | "Ask about drift, tax lots, compliance deadlines, or client communications. Type `/` for action templates." |
| `src/mocks/data/ai.ts:149` | "…and automate routine workflows. **How can I assist you today?**" | 29 | delete the question; end on the capability list |
| `src/features/command-palette/CommandPalette.tsx` | placeholder: `'How can I help you today?'` | 29 — and it is a *command palette*, not a chat | `'Search clients, accounts, households — or type > for actions'` |
| `src/mocks/data/ai.ts:237` | "**I detected** a concentrated position in AAPL at 8.2%… **I recommend** a phased liquidation" | 29 | "AAPL is 8.2% of the account, against a 5% single-stock IPS limit. A phased liquidation over 90 days, paired with harvesting in correlated positions, would offset the realised gain." |
| `src/mocks/data/messages.ts:16`, `:80` | "**I ran** the drift analysis — large-cap growth is 3.2% over target." | *not a violation* — this is a named human teammate in the messaging panel. Leave it. | — |

**Rule for the fix:** first person is allowed only inside `ChatMessage.content` where `role === 'assistant'`. Everywhere else — `AIInsight.title/body`, `ActionConfirmation.description`, `nba.description`, `SuggestedPrompt`, empty states, toasts — the interface states the finding and stops.

### 2d. Emoji (rule 27)

**33 emoji ship in the bundle and render in the UI.**

| file:line | current copy | violation | rewrite |
|---|---|---|---|
| `src/lib/currency.ts:5-24` | `flag: '\u{1F1FA}\u{1F1F8}'` etc. — 20 regional-indicator flag pairs | 27 | delete the `flag` field from `CurrencyInfo` entirely |
| `src/features/settings/DisplaySettingsTab.tsx:18` | ``label: `${c.flag} ${c.code} — ${c.name}` `` | 27 — this is where they render | ``label: `${c.code} — ${c.name}` `` |

Flags are also the wrong signifier for a currency (EUR has no country; USD is used by more than one), so this is a correctness win as well as a rule-27 win.

### 2e. Errors that do not say what happens next (rule 31)

Every error in the app is a bare failure statement. Not one tells the advisor what to do or what the
system will do. This is the most systematic §2 violation after casing — and in a compliance-adjacent
product it is the one a domain reviewer will care about most.

| file:line | current copy | rewrite |
|---|---|---|
| `src/features/settings/AISettingsTab.tsx:23` | `'Failed to save AI settings'` | `'Could not save AI settings. Your changes are still on screen — try Save again.'` |
| `src/features/settings/DisplaySettingsTab.tsx:73` | `'Failed to save display settings'` | `'Could not save display settings. Reverting to your last saved preferences.'` |
| `src/features/settings/NBASettingsTab.tsx:269` | `'Failed to save NBA settings'` | `'Could not save NBA weights. Scoring is still running on the last saved preset.'` |
| `src/features/settings/TemplateLibraryEditor.tsx:246/253/260/269` | `'Failed to create/update/delete/duplicate template'` (×4) | `'Could not save the template. Your draft is kept — try Save again.'` / `'Could not delete the template. It is still in the library.'` |
| `src/features/settings/TemplatesPromptsTab.tsx:101/108/115` | `'Failed to create/update/delete prompt'` (×3) | as above, prompt-worded |
| `src/features/clients/ClientDetailPage.tsx:174` | `'Failed to add note'` | `'Note not saved. The text is still in the box — try again.'` |
| `src/features/quick-capture/QuickCaptureDialog.tsx:78` | `'Failed to save'` | `'Not saved. The capture stays open so nothing is lost.'` |
| `src/features/workflows/WorkflowStepEditor.tsx:86/91/99` | `'Failed to update/create/save template'` (×3) | `'Could not save the workflow template. Step order is unchanged.'` |
| `src/features/settings/NotificationSettingsTab.tsx:21` | `'Failed to save notification settings'` | `'Could not save notification preferences. Existing alerts are unaffected.'` |
| `src/components/ui/QueryErrorBanner.tsx:15` | `'Failed to load data'` | `'Could not load this data. Retrying automatically — reload if it does not clear.'` |
| `src/features/dashboard/MetricsBar.tsx:20` | `'Unable to load metrics'` | `'Practice metrics unavailable. Figures below are unaffected.'` |
| `src/features/portfolios/TradeTicketDialog.tsx:188` | `'Failed to submit order'` | `'Order not submitted. Nothing was sent to the custodian. Review the ticket and resubmit.'` — this is the single most important error string in the app and it currently says less than a browser 500 page |
| `src/components/RouteErrorPage.tsx:11` | `'An unexpected error occurred'` / h1 `'Page Error'` | h1 `'This page did not load'`; body `'Reloading usually clears it. No data was changed.'` |
| `src/components/ErrorBoundary.tsx` | `'An unexpected error occurred. Please try reloading the page.'` | `'This view stopped responding. Reload to recover — nothing was saved or sent.'` |

Also: `src/mocks/data/notifications.ts:73-74` — `'Trade Execution Failed — AAPL Buy'` / `'500 shares AAPL limit order expired unfilled. Price moved above $198.50 limit.'` states the failure and stops. Rewrite body: `'500 shares AAPL limit order expired unfilled — price moved above the $198.50 limit. The order is cancelled; re-enter at a revised limit if still wanted.'` Same for `:118-119` ACAT NIGO: add `'Custodian will reject in 5 business days unless the signed page 3 is uploaded.'`

**Compliance blocks with no remediation path** — the highest-stakes dead ends in the app:

| file:line | current copy | rewrite |
|---|---|---|
| `rebalance/ComplianceReviewStep.tsx:123` | `'One or more compliance checks failed. Resolve failures before executing.'` | `'{n} checks failed. Each failing check is listed above with the rule it breached — clear them, or request a supervisor override.'` |
| `rebalance/ComplianceReviewStep.tsx:132` | `'Compliance warnings detected. Review before proceeding.'` | `'{n} warnings. These do not block execution but are recorded against the batch.'` |
| `TradeTicketDialog.tsx:305` | button label `'Blocked by Compliance'` | `'Blocked — request override'` and make it a live route, not a disabled state |
| `trade-fields/ComplianceCheck.tsx:42` | `'{n} compliance violation{s} — trade blocked'` | `'{n} rules breached — order cannot be submitted. Request an override or amend the ticket.'` |
| `AccountDetailPage.tsx:58`, `TaxManagementPage.tsx:162`, `AttributionPage.tsx:60` | `'Account not found'` ×3 | `'No account with this ID. It may have been closed. Back to portfolios →'` |
| `ModelGovernancePage.tsx:285` | `'Unable to load model governance data'` | `'Model history unavailable. Current model targets below are unaffected. Retry'` |
| `onboarding/steps/RiskProfileStep.tsx:27` | `'Unable to load risk assessment questions'` | `'Risk questionnaire unavailable. You can continue and complete this step later — the application will not submit until it is scored.'` |
| `onboarding/steps/AccountSetupStep.tsx:21` | `'Unable to load account requirements'` | `'Requirements list unavailable. Continue and the checklist will populate on retry.'` |

**Silent failures — the worse category.** 13 mutations call `mutate()` with an `onSuccess` and **no `onError` at all**: `autonomy/StandingRulesCard.tsx:118/124/130/136`, `autonomy/DelegationRulesCard.tsx:109/115/121/127`, `autonomy/PermissionMatrixCard.tsx:35`, `ProposalWizard.tsx:64`, `proposals/steps/ComplianceStep.tsx:36`, `proposals/steps/FinalizeStep.tsx:24`, `onboarding/OnboardingWizard.tsx:132`, plus `useResolveBreak` on `ReconciliationPage.tsx:151-157` and `useExecuteModelTrades`. A failed **submission of a client onboarding application** (`OnboardingWizard.tsx:132`) produces no message of any kind. Rule 31 cannot be satisfied by a string here — the handler has to exist first.

**Validation that never speaks.** Seven forms disable their submit button with no statement of what is blocking it: `CampaignDialog.tsx:20/128`, `ComposeEmailDialog.tsx:32`, `LogCallDialog.tsx:29`, `QuickTaskDialog.tsx:20`, `StartWorkflowDialog.tsx:22`, `WorkflowStepEditor.tsx:104`, `OnboardingWizard.tsx:57-72`. `trade-fields/validation.ts:31-70` returns a bare boolean — the trade ticket has no validation messages at all. Minimum fix: a single line under the disabled button, e.g. `'Add an audience and a message to create the campaign.'`

### 2f. Helper text that states the obvious (rule 32)

| file:line | current copy | rewrite |
|---|---|---|
| `src/features/quick-capture/QuickCaptureDialog.tsx` | placeholder `"What needs to be done?"` | `"Task — e.g. Call Chen re: RMD before Friday"` |
| `src/features/quick-capture/QuickCaptureDialog.tsx` | placeholder `"Quick note..."` | `"Note — attaches to the client you were viewing"` |
| `src/features/settings/AISettingsTab.tsx` — `Response Detail`, `Communication Tone`, `Auto-suggest actions` | *no helper text at all* | `Response detail` → `"Concise returns figures only; standard adds the reasoning."` · `Communication tone` → `"Applies to AI-drafted client email and meeting notes, not to internal summaries."` · `Auto-suggest actions` → `"Suggestions appear inline; they never execute without approval."` |
| `src/mocks/data/ai.ts:384` | label `'Drift Threshold (%)'`, no helper | keep the label, add helper `"Absolute band. Policy default is ±3%."` — this is the brief's own worked example |
| `src/mocks/data/ai.ts:397` | label `'Minimum Loss ($)'` | add helper `"Positions below this are ignored. Wash-sale windows are checked regardless."` |
| `src/features/settings/TemplateLibraryEditor.tsx:211` | `"Preview (with sample data)"` | `"Preview — merge fields filled with the Johnson household"` |

**Placeholders that echo their own label** — 16 instances. `CampaignDialog.tsx:68` `"Campaign name..."`
directly beneath a label reading `Name`; `QuickTaskDialog.tsx:74` `"Task title..."` beneath `Title`.
Also `CampaignDialog:110`, `ComposeEmailDialog:101/123`, `QuickTaskDialog:86`, `TemplatesPromptsTab:49`,
`TemplateLibraryEditor:86`, `WorkflowStepEditor:128/137/196`, `StandingRulesCard:47/86`,
`DelegationRulesCard:41`, `ClientInfoStep:36/48`. Delete the placeholder or replace it with the format.

**Wizard step subtitles that restate the step title** — 8 instances, and each one omits the constraint
that actually matters:

| file:line | current | rewrite |
|---|---|---|
| `onboarding/steps/ClientInfoStep.tsx:23` | "Enter the client's contact information. Fields marked with * are required." | "Legal name must match the government ID uploaded at step 4." |
| `onboarding/steps/AccountSetupStep.tsx:30` | "Select the account type and fill in any additional required information." | "Changing account type regenerates the document checklist and clears the fields below." — *this is true* (`OnboardingWizard.tsx:102`) and the user is currently never told |
| `onboarding/steps/RiskProfileStep.tsx:34` | "Answer the following questions to determine the client's risk tolerance…" | "Scoring runs at 8 answers. Below that, no model is recommended." — also true (`OnboardingWizard.tsx:79`) and unstated |
| `onboarding/steps/ReviewStep.tsx:21` | "Review all information before submitting the onboarding application." | "Submission opens a workflow in compliance. Nothing is sent to the custodian until compliance approves." |
| `proposals/steps/ComplianceStep.tsx:125` | `Click "Run Compliance Check" to validate the proposal.` | delete — it duplicates the button beside it, and uses raw double quotes inside JSX |
| `proposals/steps/FinalizeStep.tsx:76` | "Review the summary below, then finalize to generate the client-ready document." | "Finalizing locks the proposal and writes it to the archive. Edits after this create a new version." |

**Constraints enforced in code, never stated in copy** — 7 numeric inputs where `min`/`step` encode a
rule the user cannot see: `LogCallDialog.tsx:86-91` (`Duration (minutes)`, min 1 / max 300, unstated) ·
`TradeTicketDialog.tsx:265` and `EquityTradeFields.tsx:69` (`placeholder="0"`, whole-share constraint
unstated) · `OptionTradeFields.tsx:155` (contract multiplier of 100 never surfaced) ·
`DigitalAssetTradeFields.tsx:92` (`placeholder="0.000000"` implies a precision it never states) ·
`NBASettingsTab.tsx:333` (`{weightsTotal} / 100` turns red at ≠100 but never says the weights are
silently normalised anyway — they are, at `computeComposite:73-81`) · `AISettingsTab.tsx:185-193`
(`Default Fee Rate` with a bare `%` suffix, no bounds, no annual-vs-quarterly basis, no bps guidance).

Two existing examples show the right pattern and should be the template for the rest:
`StandingRulesCard.tsx:79` — `"Trigger condition (e.g., '48h before quarterly review')"` — and
`rebalance/SelectAccountsStep.tsx:164` — `"All accounts are within target allocation. Adjust the
threshold above to widen the selection."` Both teach a constraint and name the lever.

Broadly: **the settings pages have no helper text anywhere.** Six tabs of controls that change AI
behaviour, autonomy and money display, with nothing explaining any constraint. For a showcase, the
settings screens are where you demonstrate that you understand the domain — and right now they
demonstrate the opposite.

### 2g. Missing hedges — outcome promised without qualification (rule 30)

| file:line | current copy | rewrite |
|---|---|---|
| `src/mocks/handlers/ai.ts:314` | "**Managing** $91.3M across 47 accounts." | "$91.3M across 47 accounts as of 24 July 2026, 06:00 ET." — removes the product-as-actor framing *and* adds the as-of |
| `src/mocks/handlers/ai.ts:328` | metric `'Estimated tax savings' : '$17,400'` | correct already — this is the model to copy |
| `src/mocks/handlers/ai.ts:341` | `'Aggregate drift impact': '$234K'` | `'Estimated drift impact': '$234K'` |
| `src/mocks/handlers/ai.ts:421` | `'After-tax yield improvement': '+0.3%'` | `'Estimated after-tax yield pickup': '+0.30%'` |
| `src/mocks/handlers/ai.ts:382` | `'Held-away estimate': '$180K'` | fine — keep |
| `src/mocks/handlers/ai.ts:406` | `'Harvestable losses': '$12,400'` | `'Harvestable losses, as of last close': '$12,400'` |
| `src/mocks/data/ai.ts:41` | "This client's portfolio is **performing well** with a 12.3% TWR YTD, **outperforming** the blended benchmark by 1.8%." | "12.3% TWR year to date, gross of fees, against 10.50% for the blended benchmark. Data as of last close." |
| `src/mocks/handlers/ai.ts:353` | "14 accounts assigned to this model **have not been rebalanced since**." | correct — keep |
| Everywhere returns are shown | no `net of fees` / `gross of fees` marker anywhere in the app | add a fee basis to every performance figure. Grep confirms the strings `net of fees` and `gross of fees` appear **zero times** in the codebase. In a wealth product, that is the omission a practitioner notices first. |

---

## 3. Casing sweep

### The count

| Location | Title Case strings | Notes |
|---|---|---|
| `src/features/**` | **497** | highest: `annotation-config.ts` 59, `ModelGovernancePage.tsx` 16, `HouseholdDetailPage.tsx` 14, `BillingPage.tsx` 14, `NBAEffectivenessContent.tsx` 13, `NBAEffectivenessPage.tsx` 12 |
| `src/types/**` | 39 | mostly label maps (`standing-rule.ts` 17, `email-template.ts` 13, `archive.ts` 6) |
| `src/components/**` | 21 | `NBACard.tsx` 8 |
| `src/lib/**` | 19 | `labels.ts` 13 (`'US Equity'`, `'Fixed Income'`, `'Tax Deferred'`…), `chart-colors.ts` 6 |
| `src/app/**` | 4 | |
| **app code subtotal** | **580** | excludes person names and currency names |
| `src/mocks/**` renderable labels | **~250** | workflow step names, campaign names, insight titles, action-template names |
| **Total** | **~830** | |

Rule 18 is the most-violated rule in the codebase by an order of magnitude.

### The mechanical rule

> Lowercase every word in a UI string except (a) the first word, (b) proper nouns — people, firms,
> product names, model names, tickers, (c) established acronyms, (d) legal instrument names that are
> proper nouns in their own right (`Roth IRA`, `SEP IRA`, `401(k)`, `Investment Policy Statement`).
>
> Asset classes, account attributes, statuses, tab names, column headers, button labels, dialog
> titles and card titles are **common nouns**. They go lowercase.
>
> The only uppercase is the 11px eyebrow style (`TOTAL AUM`, `NEXT REVIEW`), max three words.

Enforceable as a lint rule: flag any string literal reaching a `label`/`title`/`name`/`actionLabel`
prop where a non-first word matches `/^[A-Z][a-z]/` and is not in an allow-list of proper nouns.

### Highest-traffic strings, rewritten

**Navigation & page titles** — every user sees these on every screen.

| file:line | current | rewrite |
|---|---|---|
| `src/features/dashboard/DashboardPage.tsx:19-21` | `'Good Morning'` / `'Good Afternoon'` / `'Good Evening'` | `'Good morning'` / `'Good afternoon'` / `'Good evening'` |
| `src/features/actions/ActionsPage.tsx:19` | `Next Best Actions` | `Next best actions` |
| `src/features/portfolios/RiskAnalyticsPage.tsx:80` | `Risk Analytics` | `Risk analytics` |
| `src/features/portfolios/TaxManagementPage.tsx:188` | `Tax Management` | `Tax management` |
| `src/features/portfolios/AttributionPage.tsx:83` | `Performance Attribution` | `Performance attribution` |
| `src/features/portfolios/RebalancePage.tsx:167` | `Rebalance Wizard` | `Rebalance` — "Wizard" is internal jargon; the stepper already says it is multi-step |
| `src/features/portfolios/ModelGovernancePage.tsx:300` | `Model Governance` | `Model governance` |
| `src/features/workflows/WorkflowCenterPage.tsx:439` | `Workflow Center` | `Workflows` — matches the nav label, removes a second name for one thing |
| `src/features/compliance/ArchivePage.tsx:151` | `Books & Records Archive` | `Books and records` |
| `src/features/growth/RevenuePage.tsx:194` | `Practice Management` | `Revenue` — matches the route `/growth/revenue` and the nav path |
| `src/features/growth/ProspectsPage.tsx:271` | `Growth Pipeline` | `Pipeline` |
| `src/features/dashboard/NBAEffectivenessPage.tsx:40` | `NBA Effectiveness` | `Action effectiveness` |

**Urgency badges** — visible on every NBA card, so ~20 instances per screen.

| file:line | current | rewrite |
|---|---|---|
| `NBAQuickView.tsx:13-16`, `NBAFeed.tsx:35-38` | `Time-Critical` / `This Week` / `This Month` / `When Convenient` | `Time-critical` / `This week` / `This month` / `When convenient` |

**Settings tabs and card titles** — the screen a reviewer opens second.

| current | rewrite |
|---|---|
| `AI Behavior` · `Automation` · `Templates & Prompts` · `NBA Settings` · `Notifications` · `Display` | `AI behaviour` · `Automation` · `Templates and prompts` · `Action scoring` · `Notifications` · `Display` |
| `Communication Style` / `AI Persona & Defaults` | `Communication style` / `AI persona and defaults` |
| `Communication Tone` · `Response Detail` · `Default Greeting` · `Email Signature` · `Preferred Channels` · `Follow-up Cadence` | `Communication tone` · `Response detail` · `Default greeting` · `Email signature` · `Preferred channels` · `Follow-up cadence` |
| option values `Conversational` · `Standard` · `In-Person` · `1 Week` | `Conversational` · `Standard` · `In person` · `1 week` |

Note the existing inconsistency this exposes: on the same card, `Auto-suggest actions` is already
sentence case while every label around it is Title Case. The file is arguing with itself.

**Asset class and account labels** (`src/lib/labels.ts`) — these propagate to every table in the app.

```
us_equity: 'US equity'          intl_equity: 'International equity'   emerging_markets: 'Emerging markets'
fixed_income: 'Fixed income'    alternatives: 'Alternatives'          real_estate: 'Real estate'
commodities: 'Commodities'      cash: 'Cash'                          digital_assets: 'Digital assets'
private_equity: 'Private equity'
```
```
individual: 'Individual'   joint: 'Joint'   traditional_ira: 'Traditional IRA'   roth_ira: 'Roth IRA'
sep_ira: 'SEP IRA'   '401k': '401(k)'   roth_401k: 'Roth 401(k)'   '529': '529 plan'
trust_revocable: 'Revocable trust'   trust_irrevocable: 'Irrevocable trust'
ugma_utma: 'UGMA/UTMA'   entity: 'Entity'   inherited_ira: 'Inherited IRA'   simple_ira: 'SIMPLE IRA'
```
```
taxable: 'Taxable'   tax_deferred: 'Tax-deferred'   tax_free: 'Tax-free'   trust_taxable: 'Trust (compressed)'
```
Also fix `emerging_markets: 'Emerging Mkts'` → `'Emerging markets'`. Truncating to "Mkts" saves four
characters and costs a professional reader's confidence.

**Reconciliation page** — currently runs three casing conventions simultaneously: Title Case metric
labels (`Position Match`, `Open Breaks`, `Avg Resolution`), Title Case tabs (`Break Resolution`,
`Integration Health`), and **all-lowercase** severity badges (`low`, `medium`). Pick one.

| current | rewrite |
|---|---|
| `Position Match` · `Cash Match` · `Transaction Match` · `Open Breaks` · `Resolved Today` · `Avg Resolution` | eyebrow style: `POSITION MATCH` · `CASH MATCH` · `TRANSACTION MATCH` · `OPEN BREAKS` · `RESOLVED TODAY` · `AVG RESOLUTION` |
| tabs `Break Resolution` / `Integration Health` | `Break resolution` / `Integration health` |
| badges `low` / `medium` / `high` | `Low` / `Medium` / `High` |
| `Avg Resolution` value `85m` | `85 min` — `m` reads as metres or months |
| `Match Rate Trend (30 days)` / `Open Breaks (30 days)` | `Match rate, last 30 days` / `Open breaks, last 30 days` |
| `Mark Resolved` | `Mark resolved` |

**AI insight titles** (`src/mocks/handlers/ai.ts`) — 19 titles + 14 action labels, all Title Case.

| line | current | rewrite |
|---|---|---|
| `:309` | `Portfolio Health Summary` | `Book summary` |
| `:317` | `{n} Critical Action{s} Require Attention` | `{n} critical action{s} outstanding` |
| `:326` | `Tax-Loss Harvesting Window` | `Tax-loss harvesting window open` |
| `:339` | `{n} Accounts Exceeding Drift Threshold` | `{n} accounts beyond drift band` |
| `:348` | `Model Update Available` | `Model updated 20 February` |
| `:363` | `Contact Gap Detected` | `No contact in {n} days` |
| `:373` | `Risk Profile Note` | `Risk profile` |
| `:380` | `Consolidation Opportunity` | `Held-away assets detected` |
| `:395` | `Position Concentration Alert` | `Position above IPS limit` |
| `:404` | `Tax-Loss Harvesting Opportunity` | `Harvestable losses available` |
| `:419` | `Asset Location Optimization` | `Asset location mismatch` |
| `:428` | `Household Snapshot` | `Household summary` |
| `:440` | `Action Queue Summary` | `Queue summary` |
| `:448` | `Compliance Actions Approaching Deadline` | `Compliance deadlines approaching` |
| `:460` | `Campaign Performance Highlight` | `Campaign open rate above average` |
| `:467` | `Content Calendar Gap` | `No posts scheduled` |
| `:478` | `Market Conditions` | `Market conditions` |
| `:485` | `Trade Restrictions Active` | `2 securities restricted` |

Action labels: `View Critical Actions` → `View critical actions` · `Review Opportunities` → `Review
harvest candidates` · `Start Batch Rebalance` → `Start batch rebalance` · `Review Model Changes` →
`Review model changes` · `Draft Outreach` → `Draft outreach` · `Discuss with Client` → `Prepare
talking points` · `View Concentration` → `View concentration` · `Review Harvest` → `Review harvest` ·
`Generate Swap Proposal` → `Generate swap proposal` · `Filter Critical` → `Show critical only` ·
`Review Pending Posts` → `Review pending posts` · `View Restricted Securities` → `View restrictions`.

**Actions page** — `All Categories` / `All Priorities` / `All Urgency` → `All categories` / `All
priorities` / `Any urgency` (the last is also currently ungrammatical). `View AI Templates` →
`AI templates`. `Review Tax Lots` → `Review tax lots`. `Supervisor Review` → `Supervisor review`.

**Workflow step names** (`src/mocks/data/workflows.ts:30-65`) — `Application Received` →
`Application received`, `Suitability Review` → `Suitability review`, `Compliance Approval` →
`Compliance approval`, `Custodian Setup` → `Custodian setup`, `Account Activated` →
`Account activated`, `Transfer Initiated` → `Transfer initiated`, `Contra-firm Processing` →
`Contra-firm processing`, `Assets Received` → `Assets received`, `Reconciliation & Model Mapping` →
`Reconciliation and model mapping`, `Document Generated` → `Document generated`, `Advisor Review` →
`Advisor review`, `Sent for Signature` → `Sent for signature`, `Client Signed` → `Client signed`,
`Documentation Request` → `Documentation request`, `Client Provides Docs` →
`Client provides documents`, `Compliance Review` → `Compliance review`, `Funds Released` →
`Funds released`.

**Notification titles** (`src/mocks/data/notifications.ts`) — 14 titles, all Title Case. E.g.
`IPS Breach — Chen-Wong Household` → `IPS breach — Chen-Wong household`; `Trade Execution Failed —
AAPL Buy` → `Trade execution failed — AAPL buy`; `ADV Part 2 Annual Update Pending` → `ADV Part 2
annual update pending`; `Rebalance Complete — 8 Accounts` → `Rebalance complete — 8 accounts`;
`Account Opening Approved` → `Account opening approved`.

---

## 4. Number, date and currency formatting

### 4a. The utilities (`src/lib/`) — fix here and ~200 call sites follow

| file:line | current | required (rule) | fix |
|---|---|---|---|
| `src/lib/utils.ts:57` | `const sign = value < 0 ? '-' : ''` | rule 21 — true minus U+2212 | `const sign = value < 0 ? '−' : ''` |
| `src/lib/utils.ts:58` | `` `${sign}${info.symbol}${(absValue/1e9).toFixed(1)}B` `` → `$1.4B` | rule 19 — `$1.42B` | `.toFixed(2)` |
| `src/lib/utils.ts:59` | `` `…${(absValue/1e6).toFixed(1)}M` `` → `$91.3M` | rule 19 — `$91.28M` | `.toFixed(2)` |
| `src/lib/utils.ts:60` | `` `…${(absValue/1e3).toFixed(0)}K` `` → `$420K` | consistency with 19 | `.toFixed(1)` → `$420.4K`, or leave at 0 dp but document the exception |
| `src/lib/utils.ts:66` | `Intl.NumberFormat(...).format(value)` for negatives emits `-$1,234` (hyphen) | rules 21 + 24 — accounting negatives are `($1,234)` | add `currencySign: 'accounting'` to the `Intl.NumberFormat` options **and** post-process the hyphen to `−` for non-accounting contexts |
| `src/lib/utils.ts:74` | `formatPercent(v, d=2)` → `` `${v>=0?'+':''}${v.toFixed(d)}%` `` — negatives render `-3.02%` with a hyphen | rule 21 | `` const s = v < 0 ? '−' : '+'; return `${s}${Math.abs(v).toFixed(d)}%` `` |
| `src/lib/utils.ts:74` | one `formatPercent` used for both weights and returns (23 call sites) | rule 23 — weights 1 dp, returns 2 dp | split into `formatWeight(v) → 1 dp` and `formatReturn(v) → 2 dp`, and add `formatBps(v)` for sub-1% (`+64 bps`, rule 22) |
| `src/lib/utils.ts:78-84` | `formatDate` → `Jul 24, 2026` | rule 25 — `24 July 2026` prose, `2026-07-24` tables, `Aug 14` scheduling | three functions: `formatDateProse` (`en-GB`, `day:'numeric', month:'long', year:'numeric'`), `formatDateISO` (`toISOString().slice(0,10)`), `formatDateShort` (`month:'short', day:'numeric'`) |
| — | **no account-masking utility exists** | rule 26 | add `maskAccount(n: string) => '••••' + n.slice(-4)` |
| — | **no accounting-negative utility exists** | rule 24 | add `formatAccounting(v)` → `($284,100)` |

### 4b. Rendered violations

| file:line | current | required |
|---|---|---|
| `src/features/dashboard/DashboardPage.tsx:9-14` | `formatToday()` → `Friday, July 24, 2026` | `Friday, 24 July 2026` (rule 25) |
| `src/features/dashboard/MetricsBar.tsx:32` | `'+2.3% MTD'` | `'+2.30% MTD'` (rules 22, 23 — this is a return) |
| `src/features/dashboard/MetricsBar.tsx:56` | `'+$1.2M'` | `'+$1.24M'` (rule 19) |
| `src/mocks/handlers/ai.ts:311` | `'+$420K'` | `'+$420.4K'` |
| `src/mocks/handlers/ai.ts:421` | `'+0.3%'` after-tax yield | `'+0.30%'` (rule 23 — return) |
| `src/mocks/handlers/ai.ts:397` | `'8.2%'` largest position weight | correct — weight, 1 dp (rule 23) |
| `src/mocks/handlers/ai.ts:341/382/406/328` | `'$234K'`, `'$180K'`, `'$12,400'`, `'$17,400'` in the same card slot | pick one register. These are summary metrics → compact throughout: `$234.0K`, `$180.0K`, `$12.4K`, `$17.4K` (rule 19) |
| `src/mocks/data/nbas.ts:25` | `'$78.6K + $52.4K + $93.3K = $224K harvestable losses'` | arithmetic gives 224.3 → `$224.3K`; or use table form `$224,300` (rule 20) |
| `src/mocks/data/nbas.ts:25` | `'Intel (INTC) is down 18% from cost basis'` | `'down 18.24% from cost basis'` (rule 22 — two decimals on a change) |
| `src/mocks/data/nbas.ts:98` | `'8.2y effective duration vs 5.0y target'` | `'8.2 years effective duration against a 5.0-year target'` — `y` is not a unit |
| `src/mocks/data/nbas.ts:53` | `'must be taken by April 1, 2027'` | `'must be taken by 1 April 2027'` (rule 25) |
| `src/mocks/data/nbas.ts:121` | `'last had a formal review on 2025-04-15'` | ISO is table form; in prose → `'on 15 April 2025'` (rule 25) |
| `src/mocks/data/nbas.ts:144` | `'was last reviewed on 2024-09-10'` | `'on 10 September 2024'` |
| `src/mocks/data/ai.ts:22` | `'Thompson RMD deadline: March 3, 2026'` | `'3 March 2026'` (rule 25) |
| `src/mocks/data/ai.ts:127` | `'restricted through March 15, 2026'` | `'restricted through 15 March 2026'` |
| Reconciliation chart axes | `01-29 … 02-27` | `2026-01-29 … 2026-02-27` in tooltips, `29 Jan … 27 Feb` on the axis (rule 25) |
| Reconciliation break card | `Expected: 0.87  Actual: 0.85` for `goal_probability` | `Expected 87.0%  ·  Actual 85.0%  ·  Delta −2.0 pts` — raw decimals are not a number format |
| Reconciliation break card | `Field: goal_probability` / `Field: cash_balance` | `Field: goal probability` / `Field: cash balance` — snake_case is a database artefact, not copy |
| Reconciliation break card | `Expected: $164,000.00  Actual: $163,850.00` | correct per rule 20, but add the delta, which is the only number anyone wants: `Break: ($150.00)` (rule 24) |
| `src/features/clients/ClientDetailPage.tsx:53`, `HouseholdDetailPage.tsx:54`, `AccountDetailPage.tsx:163`, `portfolio-views/columns.tsx:40`, `HouseholdView.tsx:105`, `SelectAccountsStep.tsx:149`, `:306`, `SingleTradeView.tsx:288`, `mocks/handlers/search.ts:91` | `{row.original.accountNumber}` → `TRU-847291`, `BRK-293847`, `IRA-339201` | rule 26 — **9 render sites, all unmasked**. `{maskAccount(row.original.accountNumber)}` → `••••7291`. Keep the prefix if the account-type signal is wanted: `TRU ••••7291` |

### 4c. Four structural formatting faults, worse than any individual string

**(i) The date-format setting does nothing.** `DisplaySettingsTab.tsx:20-24` offers the advisor three
options — `MM/DD/YYYY (US)`, `DD/MM/YYYY (International)`, `YYYY-MM-DD (ISO)` — and **no render path
reads the preference.** `lib/utils.ts:77-83` hard-codes `'en-US'`. A settings control that visibly
does nothing is worse than no control: it is the one thing a reviewer will test, and it fails.
Either wire `formatDate` to `displaySettings.dateFormat`, or remove the control. Same class of fault:
`ProspectsPage.tsx:77` and `portfolio-views/columns.tsx:117` bypass `formatDate` entirely with their
own `toLocaleDateString('en-US', …)` **and drop the year** — `Feb 3` and `Nov 10` with no year on a
prospect close date and a rebalance date. `BillingPage.tsx:234` uses a bare `toLocaleDateString()`,
producing `7/24/2026`, a fourth format.

**(ii) "Today" is hardcoded in one file and derived in another.** `WorkflowCenterPage.tsx:94` —
`const today = new Date('2026-02-25')` — while `DashboardPage.tsx:9` uses `new Date()`. This is the
**root cause** of the timeline incoherence described in §6: every `Overdue` / `Due today` badge on the
workflow page is computed against February 2026 while the dashboard header says July 2026. One
`DEMO_NOW` constant, imported everywhere, fixes the whole class.

**(iii) `formatPercent` prepends `+` to quantities that are not changes.** `lib/utils.ts:74` always
signs. It is called on fee rates and share-of-total figures, producing:
- `BillingPage.tsx:189`, `:192` — a fee rate rendered **`+0.85%`**
- `BookOfBusinessPage.tsx:128` — a `% of AUM` column rendered **`+34.2%`**

A signed fee rate is not a formatting nit; it reads as a fee *increase*. Split the utility
(`formatReturn` signs, `formatWeight` does not) as recommended in §4a.

**(iv) Reporting currency is bypassed by hardcoded `$`.** The app has a full FX layer and a reporting-
currency setting, then hard-codes the dollar sign in five places, so switching to EUR produces euro
tooltips over dollar axes: `RevenuePage.tsx:130`, `:153`, `BookAnalyticsView.tsx:112` (chart tick
formatters), `NBASettingsTab.tsx:38-39` (`'accounts over $1M'` / `'$5M'` baked into settings labels),
`DelegationRulesCard.tsx:47` (`'Account value < $500K'` in a placeholder). Also
`DigitalAssetTradeFields.tsx:25-27` is a **second, duplicate compact-currency formatter** with
different precision (2 dp) and no currency awareness at all.

### 4d. Additional rendered violations

| file:line | current | required |
|---|---|---|
| `account-detail/OverviewTab.tsx:149` | `Target {(d.target*100).toFixed(0)}% / {(d.actual*100).toFixed(0)}%` beside drift at `toFixed(1)` on `:151` | the arithmetic visibly fails to reconcile — `60% / 64%` next to `4.1%` drift. Weights to 1 dp throughout (rule 23) |
| `ModelGovernancePage.tsx:252` | `{(ac.targetWeight*100).toFixed(0)}%` | 1 dp (rule 23). Three precisions for "weight" currently ship: 0 dp, 1 dp, 2 dp |
| `account-detail/columns.tsx:106` | tracking error `toFixed(2)` beside sibling risk metrics at `toFixed(1)` | tracking error is a return-like measure — 2 dp is right; the siblings (`maxDrawdown`, `standardDeviation`, `RiskAnalyticsPage.tsx:131-132`, `RiskTab.tsx:29-30`) are also returns and should move to 2 dp |
| `ConcentrationView.tsx:95` | HHI `toFixed(4)` | `toFixed(3)` with a label explaining the scale, or the normalised 0–10,000 form |
| `OptionTradeFields.tsx:122-134` | Greeks at 4 dp beside IV at 1 dp on `:114` | delta/gamma 4 dp is correct; IV is a percentage return-like figure → 2 dp |
| `ReconciliationPage.tsx:59-61`, `:254`, `DataQualityPanel.tsx:41` | match rates and uptime at 1 dp, coloured against a **99.5%** threshold | 99.45% and 99.54% both render `99.5%` and colour differently. 2 dp — the precision must exceed the threshold's |
| `BookOfBusinessPage.tsx:198`, `:200` | `change: { value: '4.2%', direction: 'up' }` — literal strings, not derived | fabricated deltas presented as measured change. Derive or delete |
| `RevenuePage.tsx:109-111` | `formatPercent(metrics.revenueGrowthYoY)` used as **both** the tile value and its change indicator | the same number rendered twice in one tile |
| `BookAnalyticsView.tsx:68`, `:76` | AUM-growth columns hard-coded `text-accent-green` | negative growth renders green. Rule 7 (moss up, rust down) — sign must drive colour |
| `BookOfBusinessPage.tsx:153/168/195/201/261/265`, `EngagePage.tsx:251/255/408`, `WorkflowCenterPage.tsx:187` | raw interpolation — `` `${data.organicGrowthRate}%` ``, `{camp.openRate}%` | no `toFixed` anywhere; precision is whatever the API happens to return |
| `BillingPage.tsx:97`, `:306`, `BookOfBusinessPage.tsx:199` | bps derived three different ways (`rate*10000` in two views, pre-converted by the API in a third) | one `formatBps` utility, one source of truth |
| `BillingPage.tsx:233` | `-{f.waiver!.discountBps}` — literal ASCII hyphen in JSX | `−{f.waiver!.discountBps}` (rule 21) |
| `NBASettingsTab.tsx:358` | `{delta > 0 ? '+' : ''}{delta}` | negatives get a hyphen from `toString` — use the signed formatter |
| `ModelTradeView.tsx:169` | drift rendered red with **no sign at all** | `−4.10%` / `+4.10%` (rules 21, 22) |
| `ModelGovernancePage.tsx:91`, `:149`, `:222` | `{v.effectiveDate}`, `{v.approvedDate}`, `{model.lastRebalanceDate}` — raw ISO strings, unformatted | ISO is correct in tables (rule 25) but these sit in prose audit-trail sentences — `formatDateProse` |
| `ArchivePage.tsx:109` | retention expiry via `formatDate` → `Jul 24, 2026` | a legally significant date in ambiguous US short form. `2026-07-24` |
| `tax/WashSaleCalendarView.tsx:54` | wash-sale window via `formatDate` | IRS-critical window in ambiguous format. ISO both ends |
| `account-detail/OverviewTab.tsx:101` | `<InfoRow label="Model" value={account.modelId} />` → `mod-002` | a raw database ID rendered as a value, where every other surface shows the model name |
| `RevenuePage.tsx:77` | `accessorKey: 'clientCount'` under `header: 'Households'` | the column is mislabelled — it counts clients |
| `ModelGovernancePage.tsx:233` | heading `Current Allocation` rendering `targetWeight` | actively misleading: it is the target, not the current |
| `onboarding/steps/AccountSetupStep.tsx:76-82` | `Joint Owner SSN (last 4)` and `Trust EIN` rendered as plain `type="text"`, echoed verbatim in `ReviewStep` | rule 26 extends to tax IDs. `type="password"` or masked display, `autoComplete="off"`, and never echo in review |

`compact: true` is passed at **31 call sites**, several precision-critical:
`rebalance/PreviewTradesStep.tsx:38/65/67/86` (trade values and tax impact),
`tax/CostBasisMethodCard.tsx:89/92/95` (a table whose entire purpose is comparing FIFO/LIFO/HIFO
outcomes against each other — at 1 dp compact, methods that differ by $40,000 can render identically).
Compact form belongs in summary tiles, not in comparison tables (rules 19 vs 20).

### 4e. What is already right

Worth stating, because it is most of the app: weights consistently use `toFixed(1)` (rule 23 —
20+ correct call sites), table money uses full separators via `Intl.NumberFormat` (rule 20), all
figures render in a mono face with tabular figures (rules 13, 14), numeric columns are right-aligned
(rule 34). The formatting *architecture* is right; the constants are wrong.

---

## 5. Terminology consistency

### 5a. The demo's own guided tour has five names

This is the most visible inconsistency in the product, because a first-time visitor meets three of
them within 20 seconds.

| surface | current term |
|---|---|
| `WelcomeOverlay.tsx` CTA | `Explore with Guide` |
| `AnnotationFAB.tsx` | `Guided Tour` |
| `AnnotationPanel.tsx` | `Feature Guide` |
| `AnnotationPanel.tsx` close button | `Close guide` |
| `ui-store.ts` / `annotation-config.ts` | `annotations` |
| `README.md:116` | `Annotation/demo guide layer` |
| `TopBar.tsx:114` | `About this project` |

**Canonical: `Guide`.** Welcome CTA → `Start the guide`. FAB → `Guide` (aria-label `Open guide` /
`Close guide`). Panel title → `Guide` with the route name as the subhead. README → `Guide layer`.

### 5b. Nav label vs page title vs annotation title

Each row is one screen with three different names.

| nav label | page `<h1>` | annotation `pageTitle` | canonical |
|---|---|---|---|
| `Actions` | `Next Best Actions` | `Actions Center` | **`Actions`** everywhere; keep "next best action" as the noun for a single item |
| `Clients` | `Clients` | `Client List` | **`Clients`** |
| `Households` | `Households` | `Household Hub` | **`Households`** |
| `Portfolios` | `Portfolios` | `Portfolio Overview` | **`Portfolios`** |
| `Trading` | `Trading` | `Trading Desk` | **`Trading`** |
| `Growth` | `Growth Pipeline` | `Growth Pipeline` | **`Pipeline`** (nav `Growth`, page `Pipeline`) |
| `Growth ›` | `Practice Management` | `Revenue Analytics` | **`Revenue`** |
| `Engage` | `Engage` | `Client Engagement` | **`Engage`** |
| `Workflows` | `Workflow Center` | `Workflow Center` | **`Workflows`** |

Rule: **the nav label is the page title.** If a page needs a longer name than fits in the nav, the
page is misnamed.

### 5c. Glossary — canonical terms and where the app deviates

| concept | canonical | deviations found |
|---|---|---|
| the advisor's total client base | **book** | `Book of Business` (page), `your book` (AI copy), `practice` (`Practice Management`, `Live Practice Metrics`), `across your book`. Pick `book` for the collection and `practice` only for the *business* (revenue, capacity, staffing). Currently `Practice Management` is a page about revenue and `Book of Business` is a page about the same clients. |
| a scored recommendation | **action** | `NBA`, `Next Best Action`, `action item`, `task`, `to-do`, `pending action`, `pending task`. The dashboard uses `PENDING TASKS` and `pending actions` in adjacent elements for the same underlying data. Choose: `action` = AI-scored recommendation; `task` = something a human logged. Then `PENDING TASKS 14` and `20 pending actions` are two different counts and the copy must say so. |
| distance from target weight | **drift** | `drift`, `deviation`, `variance`, `over-allocated`, `overweight`, `exceeding threshold`, `beyond band`. Standardise: `drift` (the measure), `drift band` (the tolerance), `overweight`/`underweight` (the direction). |
| target allocation set | **model** | `model`, `strategy`, `target allocation`, `IPS target`, `policy band`. Keep `model` for the instrument and `IPS` for the governing document. |
| a security holding | **position** | `position`, `holding`, `security`, `sleeve`. `sleeve` is correct for a UMA segment — keep it distinct. |
| tax-loss harvesting | **tax-loss harvesting** | `TLH`, `Tax-Loss Harvest`, `harvest`, `Harvest Scanner`, `tax management`. Expand `TLH` on first use per screen; `harvest` as the verb is fine. |
| a potential client | **prospect** | `prospect`, `lead`, `opportunity`, `pipeline item`. Use `prospect`. |
| money owed to the firm | **fee** | `fee`, `revenue`, `billing`, `TRR`. `Total Recurring Revenue` appears once and is never defined. |
| a client grouping | **household** | `household`, `family`, `relationship`. Use `household`; the brief is explicit that clients are named by household. |
| a reconciliation mismatch | **break** | `break`, `exception`, `mismatch`, `discrepancy`. `break` is correct industry usage — keep, but the status bar's `2 breaks` needs a tooltip on first hover for non-specialists. |
| AI acting without approval | **standing rule** | `standing rule`, `autonomy`, `delegation`, `permission matrix`, `auto-approve`. Four names for one mental model on one settings tab. Canonical: `standing rule` = the trigger; `autonomy level` = how much it may do; `delegation` = handing a specific item over. |

### 5d. "Something is wrong" has four names across three features

| feature | term | file:line |
|---|---|---|
| reconciliation | **break** | `ReconciliationPage.tsx:134` `Open Breaks`, `:139` `All breaks resolved` |
| concentration | **breach** | `ConcentrationView.tsx:101` `IPS Breaches`, `:165` badge `Breach` |
| trade compliance | **violation** | `trade-fields/ComplianceCheck.tsx:42` `compliance violation` |
| rebalance compliance | **failed** | `rebalance/ComplianceReviewStep.tsx:123` `compliance checks failed` |

And the resolution verb splits too: `All breaks resolved` vs `All compliance checks passed`.
Canonical: **break** for a reconciliation mismatch (correct industry usage, keep it), **breach** for a
policy/IPS limit exceeded, **failure** for an automated check that did not pass. Three concepts, three
words, used consistently — not four words for one concept.

### 5e. Abbreviation is applied at random

The app abbreviates the same word in some places and not others, with no rule:

| concept | forms shipping | pick |
|---|---|---|
| quantity | `Qty` ×6 (`account-detail/columns.tsx:35`, `SingleTradeView.tsx:55`, `columns.tsx:123`, `HarvestScannerView.tsx:68`, `TaxLotsView.tsx:67`, `PreviewTradesStep.tsx:50`) vs `Quantity` ×1 (`ModelTradeView.tsx:355`) | `Qty` in table headers, `Quantity` in forms |
| market value | `Mkt Value` (`account-detail/columns.tsx:45`) vs `Market Value` (`ConcentrationView.tsx:140`) | `Market value` |
| estimated | `Estimated Value` (`trade-fields/shared.tsx:185`) vs `Est. Value` (`PreviewTradesStep.tsx:51`) vs `Est. Tax Impact` (`ModelTradeView.tsx:312`) vs **`Tax impact:` with the hedge dropped entirely** (`PreviewTradesStep.tsx:38`, `:86`) | always `Estimated` — this is a rule-30 hedge, not decoration, and it must not be abbreviated away |
| last rebalance | `Last Rebal` (`portfolio-views/columns.tsx:114`) vs `Last Rebalance` (`OverviewTab.tsx:100`, `ModelGovernancePage.tsx:221`) | `Last rebalance` |
| emerging markets | `Emerging Mkts` (`lib/labels.ts`) | `Emerging markets` |
| standard deviation | `Std Deviation` (`RiskAnalyticsPage.tsx:132`) | `Standard deviation` |
| drift setting | `Drift threshold` (`SelectAccountsStep.tsx:89`) vs `Drift Tolerance` (`ModelGovernancePage.tsx:211`) | `Drift band` — the brief's own term |
| average drift | `Avg Drift` / `Avg drift` / `Total Drift` / `Drift %` / `Drift` — five forms across `ModelsView.tsx:64`, `HouseholdView.tsx:75`, `OverviewTab.tsx:125`, `ModelTradeView.tsx:165`, `portfolio-views/columns.tsx:80` | `Drift` |
| rebalance CTA | `Rebalance Now` / `Rebalance` / `Rebalance Household` / `Rebalance Model` / `Rebalance Wizard` | `Rebalance` |

`Rebalance Now` deserves a separate note: it is the only urgency-flavoured CTA in the product, and it
sits beside `Rebalance recommended` on one screen and `{n} need rebalance` on another. "Need" versus
"recommended" is a fiduciary-register difference, not a wording preference. Standardise on
**`recommended`** — the system observes, the advisor decides.

### 5f. Wizard steppers disagree with their own panels

Every step in both wizards is labelled twice, differently. A user watching the stepper and reading the
panel heading sees two different names for where they are.

**Onboarding** (`OnboardingWizard.tsx:15-21` vs the step components):

| stepper | panel heading | fix |
|---|---|---|
| `Client Info` | `Client Information` (`ClientInfoStep.tsx:21`) | both → `Client details` |
| `Risk Profile` | `Risk Profile Assessment` (`RiskProfileStep.tsx:32`) | both → `Risk profile` |
| `Account Setup` | `Account Setup` | both → `Account setup` ✓ already matched |
| `Documents` | `Document Checklist` (`DocumentsStep.tsx:17`) | both → `Documents` |
| `Review` | `Review & Submit` (`ReviewStep.tsx:19`) | both → `Review` |

**Proposals** (`ProposalWizard.tsx:13-18`) — 4 of 4 disagree, and step 1's id disagrees with its own label:

| stepper | id | panel heading | fix |
|---|---|---|---|
| `Template & Data` | `template_select` | `Select Proposal Template` (`TemplateDataStep.tsx:57`) | all → `Template` |
| `Review & Edit` | `review_edit` | `Review & Edit Sections` (`ReviewEditStep.tsx:75`) — *plus* a sub-toggle offering `Document Preview` / `Edit Sections`, a third name for the same step | all → `Sections` |
| `Compliance` | `compliance` | `Compliance Review` (`ComplianceStep.tsx:45`) | all → `Compliance` |
| `Finalize` | `finalize` | `Finalize Proposal` (`FinalizeStep.tsx:74`) | all → `Finalise` |

Rule: **the stepper label is the panel heading.** One string, one constant, rendered twice.

### 5g. Settings tab labels disagree with the components behind them

`SettingsPage.tsx:11` labels a tab `AI Behavior` and renders `AISettingsPanel`; `:12` labels
`Automation` and renders `AIAutonomyTab`; `:14` is `NBA Settings` — the only tab in the product that
exposes an unexpanded internal acronym. Rename the tab to `Action scoring` (see §3) and the acronym
disappears from the UI entirely.

Related: `Template` currently names six unrelated things — `Template Library`
(`TemplateLibraryEditor.tsx:282`), `Templates & Prompts` (`SettingsPage.tsx:13`), `Document Templates`
(`AISettingsTab.tsx:143`), `Preferred Proposal Template` (`:147`), the workflow `Templates` tab
(`WorkflowCenterPage.tsx:411`), and `Select Proposal Template` (`TemplateDataStep.tsx:57`). Qualify
every one: `Email templates`, `Prompt library`, `Document templates`, `Proposal templates`,
`Workflow templates`.

And `Save` has five forms: `Save`, `Save Template`, `Update Template` / `Create Template`,
`Save as New Template`, `Save & Close`. Use `Save` for the common case and reserve the qualified forms
for genuinely different destinations.

### 5h. Keyboard shortcut documented two ways

`TopBar.tsx:57` renders `Quick Capture (Ctrl+/)`; `README.md:24` says `Quick capture (Ctrl+N)`. The
README is wrong. Also `Ctrl+K` in the README vs the `⌘K` chip rendered in the search field — the
component does the platform swap correctly, the README does not mention it.

---

## 6. Narrative & first impression

### The 10-second read — what the dashboard currently says

A first-time visitor sees, in order: a personal greeting to someone named Sarah; a date; five metric
tiles; three pastel AI cards; a list of financial actions; a schedule. The visual craft lands
immediately — the density, the tabular figures, the restraint.

Then, if they read, three things go wrong within one screen height:

1. **`PENDING TASKS 14`** sits two inches above **`20 pending actions identified`** and
   **`View all 20 actions`**.
2. **`2 Critical Actions Require Attention`** has the body **`3 time-sensitive items detected`**.
3. **`NET FLOWS MTD $1.3M`** sits above **`Net inflows this month: +$420K`**.

And one that lands a beat later: the header says **`Friday, July 24, 2026`**, the schedule panel to
its right says **`Wednesday, Feb 25`**, the reconciliation chart runs to **`02-27`**, and NBA
deadlines are in **`Mar 12`**. Open the AI panel and the book is **`$847M across 42 households`**
instead of `$91.3M across 47 accounts`.

For most software this is cosmetic. For *this* software it is the whole argument. The product's claim
is that it handles numbers better than the incumbents. A reviewer who catches one of these stops
trusting all of them, and then the engineering does not get credited either.

**This is the single highest-value fix in the report and it is a data-seeding job, not a copy job.**
The root cause is identifiable and small:

- `WorkflowCenterPage.tsx:94` — `const today = new Date('2026-02-25')`, hardcoded, while
  `DashboardPage.tsx:9` uses `new Date()`. Every `Overdue` / `Due today` badge in the workflow centre
  is computed against February 2026.
- `DashboardPage.tsx:31` — `'4 meetings, 14 pending actions'`, a hardcoded string beside a live count.
- `MetricsBar.tsx:32`, `:56` — `'+2.3% MTD'`, `'+$1.2M'`, hardcoded deltas.
- `mocks/data/ai.ts:19` — `'$847M AUM across 42 households'`, a book size that exists nowhere else.
- `BookOfBusinessPage.tsx:198`, `:200` — `'4.2%'`, `'0.3%'` literal change strings.

Fix: one exported `DEMO_NOW`; every fixture date generated relative to it; every aggregate derived
from the same `computeTotalAUM()` the insight cards already use; the seven hardcoded strings deleted.
That is an afternoon, and it converts the demo's biggest liability into its strongest proof.

### What the first 10 seconds *should* say

The dashboard's job in a portfolio piece is to answer "what is this and why is it hard?" before the
visitor decides whether to click. It currently answers only the first half — and it opens with
`Good Evening, Sarah`, which is a greeting to somebody else. The visitor is not Sarah.

Two options, in order of preference:

**(a) Keep the greeting, add the frame.** Replace the hardcoded subtitle with something that carries
the thesis and the disclaimer at once:

> `Good evening, Sarah`
> `Friday, 24 July 2026 · 4 meetings, 14 open actions · Demonstration data — no real clients`

**(b) Lead with the thesis line that already exists but is buried in `index.html`.** The best sentence
anyone has written for this project is the OG description:

> *"What if you could design an advisor desktop unconstrained by legacy systems?"*

It appears only in a meta tag that no human will ever see. That is the line the welcome overlay should
open with.

### The welcome overlay — good, and one step from very good

`WelcomeOverlay.tsx` is the strongest copy in the repo. It is specific, unhyped, and it earns
credibility by disclosing cost:

> "Fifteen years of opinions about what wealth management software gets wrong, distilled into a
> clickable prototype. Built in seven days, about ten hours of effort, and less than $100 in AI tokens."

Three fixes:

- **The CTAs undersell it.** `Explore with Guide` / `Dive In` — "Dive In" is Title Case and casual in
  a way nothing else in the app is. Rewrite: primary `Start the guide`, secondary `Explore on my own`.
- **The thesis is missing its subject.** It says what the artefact is, not what it argues. Add one
  line above it: `What an advisor desktop looks like when nothing is inherited from a legacy system.`
- **No disclaimer.** Add, in the caption row alongside the build context:
  `All clients, balances and transactions are fabricated. Nothing here connects to a custodian.`

Rewritten build-context line: `Best on desktop and tablet · React and TypeScript · Built with Claude Code`
(currently `React + TypeScript · Claude Code` — the bare product name reads like a credit, not a
sentence).

### The footer

Current: `Reference Design by Joel Lewis · ⚠ 2 breaks · joelelewis.com · Concept v1`

Three problems. `Reference Design` is Title Case (rule 18). `Concept v1` implies a v2 that will never
exist — version numbers on a concept promise a roadmap. And the status-bar `2 breaks` reads, to
someone who does not know it is a reconciliation term, as *the demo has two bugs*.

Rewrite: left `Reference design · Joel Lewis`; centre the break indicator with a tooltip
`2 open reconciliation breaks — click to review`; right `joelelewis.com · Demonstration data`.

Dropping `Concept v1` for `Demonstration data` converts a meaningless version string into the one
disclaimer the app is missing, at zero layout cost.

### The 3-minute path

The strongest arc through 27 routes, for someone clicking around before they get bored:

1. **Dashboard** — "here is a morning." Establishes density and the AI-in-the-flow claim.
2. **Actions** — "here is the queue, and it is scored." The differentiator against a CRM.
3. **One NBA → Rebalance** — "and the recommendation is a *link into execution*, not a notification."
   This is the moment the demo wins, because it is the thing real products fail at.
4. **Trading** — "and execution is multi-asset, with pre-trade compliance." Depth proof.
5. **Settings › Automation** — "and you decide how much of that runs without you." The thesis
   landing: AI as teammate, with a permission model.
6. **Reconciliation or Archive** — "and it survives the parts of this business nobody demos."

**The current IA does not support that arc.** Steps 3 and 5 are the two most differentiating screens
and both are buried: the rebalance wizard is reachable only from a table selection or an insight card
deep-link, and the autonomy/permission matrix — the single most interesting design artefact in the
project — is behind Settings › tab 2 of 6, where nobody browsing casually will find it.

Three changes:

- **Make the guide an ordered path, not a per-page overlay.** It currently annotates whatever page you
  happen to be on. Give it a `Next →` that walks the six steps above in order, with a
  `Step 3 of 6` counter. The content is already written; it needs a spine.
- **Promote autonomy out of Settings.** Either a nav entry (`Autonomy`) or a permanent entry point
  from the AI panel header (`Standing rules`). At minimum, an annotation on the dashboard that says
  `Every AI action here obeys a rule you set — see Settings › Automation`.
- **Give `/actions` a visible route into execution.** The NBA cards already deep-link; the guide never
  says so. Annotation copy: `Execute opens the screen where the work happens — the rebalance wizard,
  the trade ticket, the tax lot view — with this client's data already loaded.`

### Empty states

All fourteen are bare nouns: `No accounts`, `No documents on file`, `No positions`, `No templates`,
`No orders`, `No data`. §2 asks empty states to be one of the few places Instrument Serif appears —
they are an editorial moment, and the app treats them as null-checks. In a demo they will almost never
be seen, so this is low priority, but the two that *are* reachable deserve copy:

| file:line | current | rewrite |
|---|---|---|
| `CommandPalette.tsx:121` | `No results for "{query}" — try a client name, account number, or >action` | keep — this is the best empty state in the app and the only one that teaches |
| `HarvestScannerView.tsx:60` | `No harvest opportunities found (losses > $1,000)` | `No harvestable losses above $1,000 in this account. Lower the threshold in scanner settings to see smaller lots.` |
| `NotificationCenter.tsx` | `All clear` / `No notifications right now.` | `Nothing outstanding` / `New alerts appear here as they are raised.` |
| `DataTable.tsx:43` | default `'No data'` | `'Nothing to show'` — and require callers to pass something specific |

---

## 7. Naming & brand recommendation

### The current state

Three names are in play. **"Advisor Desktop"** in the app, `package.json`, `index.html` and README.
**"Meridian"** in the design system brief, flagged there as a placeholder. **"AD"** as a two-letter
monogram in a rounded ink square, in the sidebar and the welcome overlay.

### Assessment

**"Advisor Desktop" is a category, not a name** — and for this artefact that is the right call.

The instinct on a portfolio piece is to invent a brand, and the brief has already half-invented one.
Resist it. A fictitious brand name on a showcase creates a specific and expensive ambiguity: the
viewer's first question becomes *"is this a real product? did he work on this? is this his company?"*
Every second spent on that question is a second not spent on the craft. A descriptive name closes the
question immediately — this is an advisor desktop, and the byline says who made it.

"Meridian" additionally collides with real financial-services brands (Meridian Credit Union, Meridian
Wealth Management, Meridian Capital), which turns a search for the work into a search for someone
else's company.

The weakness of "Advisor Desktop" is that "Desktop" reads slightly 2003. That is survivable, and
arguably useful: the whole thesis is that this category's incumbents *are* from 2003 and the answer is
not to rename the category but to rebuild it. If it needs defending, the welcome overlay can defend it
in one clause.

**The monogram is the thing to cut.** "AD" in a filled square is company-logo grammar. It signals
"here is a startup" — the exact reading you do not want. The design system is explicit that no logo
exists and the brand is type-only; the app has quietly invented one anyway.

### Recommendation

**Keep the product name. Make the author the brand. Set the wordmark in type.**

**Wordmark** — sidebar and welcome overlay, replacing the `AD` square:

```
Advisor Desktop
```

Instrument Sans, 15px, semibold, `--tracking-tight`, ink-900. No mark, no square, no colour. When the
sidebar is collapsed, the rail shows the app icon glyph (`layout-grid`), not a monogram.

**Full lockup** — welcome overlay and any OG image:

```
Advisor Desktop
A reference design by Joel Lewis
```

The second line in `--body-sm`, `--text-muted`. That is the whole brand: a descriptive name and a
byline. Attribution is the differentiator, so attribution gets the typographic weight that a fake logo
was borrowing.

**Serif for one moment only.** Rule 12 permits Instrument Serif in the sign-in value line, empty
states, report covers and the wordmark. Spend it on the thesis line in the welcome overlay — one
32–40px serif sentence, then everything else in sans:

> *What an advisor desktop looks like when nothing is inherited.*

That single serif line is the memorability the name is not carrying, and it costs nothing.

**Retire `Concept v1`.** Replace with `Demonstration data` in the footer (see §6).

**Retire "Meridian" from the brief** or mark it explicitly as the *design system's* name, distinct
from the product's. A design system having its own name is normal and defensible; two names for one
artefact is not.

---

## 8. Missing copy for a showcase

Ranked by what a professional visitor will miss.

**1. A "these numbers are not real" statement. Nowhere in the running app.**
The app shows named individuals with balances, wire transfers, tax positions and compliance breaches.
There is no disclaimer on any screen. This is the one omission with an actual downside — a wealth
professional reading `Richard Anderson's account received a $250K wire transfer yesterday` with no
frame is entitled to wonder. Two placements, both free:

- Footer, replacing `Concept v1`: `Demonstration data`
- Welcome overlay caption: `All clients, balances and transactions are fabricated. Nothing connects to a custodian, a market feed or a real book.`

**2. A "what am I looking at" moment on the dashboard.** The welcome overlay is dismissed once and
stored in `localStorage`, after which a returning visitor — or anyone landing on a deep link — gets no
frame at all. Add a dismissible one-line banner above the metrics bar for the first three sessions:

> `Reference design — a working prototype of an AI-native advisor workstation. Data is fabricated. Take the guide ·  Dismiss`

**3. The guide has no beginning, middle or end.** See §6. It needs `Step {n} of {total}`, a `Next`
that changes route, and a closing card. Suggested closing card:

> **`That's the tour`**
> `Twenty-seven screens, 175 mock endpoints, no backend. The parts worth your time: the scored action queue, the permission matrix in Settings › Automation, and the multi-asset trade ticket.`
> `Read the build notes · joelelewis.com`

**4. Per-annotation "why this is hard".** The annotations currently describe *what the feature does* —
which a professional audience can see. They do not say what was difficult, which is the only thing
that differentiates a showcase from a screenshot. One added sentence per annotation, e.g. for
`dash-nba`:

> Current: `AI-scored and prioritized action items. Each NBA has a composite score…`
> Add: `The hard part is the deep link. Most products surface a recommendation and stop; here every action carries the route, the entity and the prefilled parameters for the screen that executes it.`

**5. Method and provenance, in-product.** The welcome overlay discloses build time and token cost —
genuinely disarming, and the best trust move in the project. It should go one step further and name
what is *not* real, because volunteering the limits is what makes the rest believable:

> `Real: the data model, the calculations, the state machines, every screen. Mock: the API layer, the market data, the AI responses — scripted, not generated at runtime.`

**6. Keyboard-shortcut discoverability.** `Ctrl+K`, `Ctrl+J`, `Ctrl+M`, `Ctrl+/`, `Alt+1–9` all exist
and are documented only in tooltips and a stale README. A `?` overlay listing them is a 30-minute
build that materially changes how a keyboard-first reviewer experiences the demo.

**7. Section-level empty-state copy for the guide-off state.** When annotations are toggled off there
is no affordance saying they exist beyond the FAB. The FAB should carry a first-visit tooltip:
`Guide — annotations for this screen`.

---

## 9. Supporting content — README and docs

`README.md` is a feature inventory, not a portfolio piece. It opens with a spec and never states the
argument. For a repo whose purpose is to be judged, the first screen of the README is doing the least
work of any surface in the project.

**Factual errors — the README describes a different app than the one that ships:**

| line | claim | actual |
|---|---|---|
| `:3` | "20+ pages" | **27** routes (`routes.tsx`) |
| `:3` | "130+ mock API endpoints" | **175** (`index.html` already says 175+ — the README is the stale one) |
| `:116` | "28 annotations across 12 routes" | **49** annotations across 12 routes |
| `:117` | "Welcome overlay with feature statistics" | the overlay has no statistics; it has a thesis and three product opinions |
| `:24` | "Quick capture (`Ctrl+N`)" | the app binds `Ctrl+/` |
| `:134` | "Fonts \| Inter (UI) + JetBrains Mono" | `index.html` loads **Instrument Sans + Plus Jakarta Sans + JetBrains Mono** |
| `:139-155` | `npm install` / `npm run dev` / `npm test` | repo is **pnpm** (`packageManager: pnpm@11.9.0`, migrated in `72dad62`). Same error in `CONTRIBUTING.md:11`. **This one is fatal** — the first command a reviewer runs fails or silently generates a second lockfile. |
| `:178` | "12 CSS custom properties" | undersells substantially |

**Structural fix.** Replace the opening 3 lines with the argument, then the proof, then the inventory:

```markdown
# Advisor Desktop

**What an advisor desktop looks like when nothing is inherited from a legacy system.**

A working prototype of an AI-native wealth management workstation: 27 screens, 175 mock API
endpoints, no backend. Built in seven days and about ten hours of effort.

Fifteen years of opinions about what this category gets wrong, made clickable. Three of them:

- **Collaboration is the default.** Team servicing is visible in the workflow, not bolted on afterwards.
- **AI is a teammate, not a chatbot.** Agents and humans run the same workflows under the same permission model.
- **The asset universe is modern.** Equities through digital assets, 33 currencies, global accounts.

→ **[Live demo](https://advisor.joelelewis.com)** · guided tour built in

All data is fabricated. Nothing connects to a custodian, a market feed, or a live model.

## What is worth looking at

| | |
|---|---|
| **The scored action queue** (`/actions`) | Every recommendation carries the route, entity and prefilled parameters for the screen that executes it. Most products surface a recommendation and stop. |
| **The permission matrix** (`/settings` › Automation) | Per-action-type autonomy: auto-approve, queue for review, notify and hold. The design problem underneath "AI agent". |
| **The multi-asset trade ticket** (`/portfolios/trading`) | Five asset classes, class-specific fields, pre-trade compliance that blocks submission. |
| **Reconciliation and the archive** (`/workflows/reconciliation`, `/workflows/archive`) | The unglamorous half of this business, which demos normally skip. |
```

Then the existing feature inventory, unchanged — it is genuinely useful, just not first.

**Also:** the five shields.io badges at the top are the visual grammar of an open-source library
seeking adopters, not a portfolio piece. On a showcase they read as filler. Cut them or reduce to one.

---

## 10. Ranked recommendations — by impact per effort

| # | Recommendation | Impact | Effort |
|---|---|---|---|
| 1 | **Reconcile the demo's numbers with itself.** One `DEMO_NOW` constant; derive every date from it; make AUM, pending-action and net-flow counts come from one source. Delete the hardcoded `'4 meetings, 14 pending actions'`, `'+2.3% MTD'`, `'+$1.2M'`, `'$847M AUM across 42 households'`. | Critical — this is the finding that costs the most credibility, and it costs it fastest | M |
| 2 | **Global sentence-case pass.** ~830 strings. Start with the 60 highest-traffic: nav, page titles, urgency badges, settings tabs and labels, `lib/labels.ts`, AI insight titles and action labels. Add the lint rule so it cannot regress. | Critical — most-violated rule, and the one a design-literate reviewer clocks instantly | M |
| 3 | **Add a mock-data disclaimer.** Footer `Concept v1` → `Demonstration data`; one line in the welcome overlay. | Critical — the only genuinely load-bearing missing sentence | S |
| 4 | **Rewrite `annotation-config.ts` out of vendor voice.** 49 annotations; strip `10x`, `360°`, `Instant`, `Real-Time`, `Smart`, `junior analyst`, `in under two seconds`. Add one "why this is hard" sentence per annotation. | Critical — the guide is the surface being judged, and it is currently the worst-written file | M |
| 5 | **Fix the formatting utilities** (`src/lib/utils.ts`): true minus U+2212, two-decimal compact money, split `formatPercent` into `formatWeight`/`formatReturn`/`formatBps`, three date formatters, add `maskAccount` and `formatAccounting`. ~200 call sites inherit the fix. | High — rules 19–26 in one file | S |
| 6 | **Mask account numbers** at all 9 render sites. `TRU-847291` → `TRU ••••7291`. | High — rule 26, and the most obviously wrong thing on the client and account pages | S |
| 7 | **Fix the README's factual claims and the pnpm/npm instructions.** A reviewer's first command currently fails. | High — cheapest credibility win in the repo | S |
| 8 | **Give every error a next step.** 16 strings, all listed in §2e. Start with `'Failed to submit order'`. | High — rule 31, zero current compliance, and the register the audience cares about | S |
| 9 | **Settle on one name for the guide** (`Guide`) and one name per page (nav label = page title). 9 pages, 7 guide surfaces. | High — reads as carelessness in a product whose pitch is coherence | S |
| 10 | **Remove first-person from non-chat AI surfaces.** Insight bodies, action descriptions, NBA text, command palette placeholder. Leave `role: 'assistant'` chat turns alone. | High — rule 29, and it changes the product from "assistant persona" to "instrument", which is the more defensible position | M |
| 11 | **Delete the 33 flag emoji** (`lib/currency.ts` field + `DisplaySettingsTab.tsx:18`). | Medium — rule 27, absolute prohibition, two-line fix | S |
| 12 | **Turn the guide into an ordered 6-step path** with `Step n of 6`, a `Next` that changes route, and a closing card. | Medium–High — converts a browsable demo into a narrated one, which is what a 3-minute visitor needs | M |
| 13 | **Add helper text to the settings tabs.** Six tabs of controls with no explanatory copy; §2f has the strings. | Medium — settings is where domain understanding is demonstrated, and it currently demonstrates none | S |
| 14 | **Add fee basis and as-of to performance figures**, and delete the past-performance claim at `proposals.ts:51`. `net of fees` / `gross of fees` appear zero times in the codebase. | Medium–High — rule 30. `proposals.ts:51` alone ("historically outperforms over 15+ year horizons") is the string a compliance reader will stop on | M |
| 15 | **Make the stepper label the panel heading** in both wizards — 8 of 9 steps currently disagree with themselves — and make the tab label the component's subject in Settings. | Medium — one shared constant per step; it is the kind of detail this audience reads as evidence of care | S |
| 16 | **Wire the date-format setting, or remove it.** `DisplaySettingsTab.tsx:20-24` offers three formats and no render path honours any of them. | Medium — a visible control that does nothing is the first thing a reviewer tests | S |
| 17 | **Replace the `AD` monogram with a type-only wordmark**, and promote the thesis line (`What an advisor desktop looks like when nothing is inherited.`) into the welcome overlay in Instrument Serif. | Medium — removes the "is this a real company?" ambiguity and spends the one permitted serif moment where it earns most | S |

**Below the line but worth an hour each:** add `onError` to the 13 silent mutations (§2e) — a failed
onboarding submission is currently invisible; drive the AUM-growth column colour from the sign
(`BookAnalyticsView.tsx:68/76` is hardcoded green); mask the SSN and EIN inputs in onboarding
(`AccountSetupStep.tsx:76-82`); stop `formatPercent` signing fee rates (`+0.85%`); and delete the
"successfully" from the five toasts.

---

### Closing note

The reason this critique runs long is not that the writing is bad. It is that the writing is good
enough that its failures are legible — a sloppier product would not have a voice to violate. The
in-product copy is already 80% of the way to the brief; the gap is concentrated in three places (the
demo's self-presentation, the casing, and the numbers not agreeing), and all three are bounded,
mechanical, and fixable in a day.
