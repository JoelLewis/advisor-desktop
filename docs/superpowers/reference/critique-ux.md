# Advisor Desktop — Senior Design Critique & Interface Quality Audit

**Reviewed:** 20 screens (light + dark), `portfolios-1280.png`, source at `/Users/joellewis/code/advisor-desktop`
**Lenses:** `impeccable:critique` (design effectiveness) + `impeccable:audit` (interface quality)
**Audience assumed:** public portfolio / capability showcase, judged by people who look at interfaces professionally.

---

## 1. Verdict

**Would this impress someone who reviews interfaces for a living? Not yet — it would impress them with its *scope* and then lose them on its *surface*.**

The engineering ambition is real and legible: 25 routes, 175 files, a resizable AI panel with a proper backdrop and `role="separator"`, a skip link, a global `prefers-reduced-motion` block, a keyboard shortcut layer, an immutable AI-output archive with model attribution. Someone who reads code will respect it. But this is being judged on *craft*, and craft is what fails first and fails visibly.

**The single biggest thing holding it back:** the app has **no visual point of view**. Its entire colour system is the Tailwind default `slate` ramp plus `blue-600` — verbatim, in `src/index.css:169-198`. Its body typeface is Plus Jakarta Sans (`src/index.css:22`). Its AI layer is lavender-tinted cards with a sparkle glyph. Its status vocabulary is coloured pill badges. Put together, this is the *median* output of an AI coding tool in 2025 — and that is precisely the thing a portfolio piece cannot afford to be. There is a written design system sitting next to this repo (warm cream, espresso ink, earth pigments, hairline rules, serif display) and the app implements essentially none of it. The gap isn't "a few tokens off"; the app and the brief are two different products.

Underneath the aesthetics, four failure classes will get spotted in the first two minutes by anyone from this industry:

1. **Two charts are visibly broken.** The Revenue Trend line falls to $0 and flatlines (`revenue.png`) — a wealth-management demo whose headline revenue chart shows revenue going to zero. Root cause: `src/mocks/data/revenue.ts:102-103` writes `2026-04` and `2026-05` as `revenue: 0`, months that were future when authored and are now past. The AUM waterfall renders four of its six bars as 8px slivers on a $0–100M axis (`book.png`).
2. **Numeric columns are left-aligned in the two most important tables.** `clients.png` (AUM) and `portfolios.png` (Value, Drift). `billing.png` gets it right, which proves this is inconsistency, not incapability. In a financial tool this is the equivalent of a spelling mistake in a headline.
3. **Every row of a 41-row table carries a solid blue primary button** (`portfolios.png`). There is no hierarchy left on the page.
4. **The numbers don't agree with each other.** Total AUM reads **$91.3M** on the dashboard, **$102.5M** on Portfolios, **$91.3M** on Book of Business — while `src/mocks/data/practice.ts:41-46` hand-types `$99,855,000` and `src/mocks/data/clients.ts` sums to `$107,055,000`. Same figure, four values. In a product whose entire claim is numerical trustworthiness, this is the finding that ends the review.

**The design system was built and then bypassed.** `Button.tsx`, `EmptyState.tsx` and `FilterBar.tsx` are fully authored and have **zero imports** — while 278 hand-rolled `<button>` elements across 103 files carry **eight different padding combinations for the primary blue alone**. `text-h2` and `text-h3` are used at 8 sites and **defined nowhere**, so those headings render at browser-default size in both wizards. `accent-yellow` is used at `ArchivePage.tsx:34-35` and is likewise undefined — the "Edit Summary" callout renders with a transparent border, no background, and invisible text. This is the tell that a reviewer who opens the source will find, and it undercuts the craft argument more than any single visual issue.

There is also one genuinely excellent idea in here — the **Books & Records Archive** (`archive.png`): WORM immutability badges, per-document disposition (Approved / Edited / Rejected), named model attribution, and an AI-original-vs-final diff. That is a serious, differentiated answer to "how do you make AI trustworthy in a regulated workflow," and it is buried three levels deep under Workflows — where **10 of its 15 records have byte-identical original and final content** (`src/mocks/data/archives.ts`, lines 40/41, 59/60, 78/79, 117/118, 156/157, 195/196, 213/214, 233/234, 252/253, 271/272), so the diff — the whole point — is empty two-thirds of the time. **That idea, not the sparkles, is the product, and it is being demonstrated with data that hides it.**

**Honest summary:** competent information architecture, real engineering depth, a generic surface, a design system that exists but isn't used, several visible correctness bugs, demo data five months stale, and one distinctive idea it hasn't noticed it has.

---

## 2. Distinctiveness analysis

### The AI-slop verdict: **FAIL**

If you showed this to a designer and said "an AI built this," they would believe you immediately. Here is the evidence, tell by tell.

**Tell 1 — the palette is literally Tailwind defaults.** `src/index.css:169-183`:
```
--surface-primary: #FFFFFF   (pure white — the one thing every palette guide says not to do)
--surface-secondary: #F7F9FC  --surface-tertiary: #F0F4F8
--text-primary: #0F172A  (= slate-900)   --text-secondary: #475569 (= slate-600)
--text-tertiary: #94A3B8 (= slate-400)
--accent-blue: #2563EB (= blue-600)  --accent-green: #059669 (= emerald-600)
--accent-red: #DC2626 (= red-600)    --accent-amber: #D97706 (= amber-600)
```
Every neutral is a *cool blue-grey* (R < G < B). This is the single most recognisable AI-dashboard palette in existence. Dark mode (`:185-198`) is the same ramp inverted — slate-900 page, slate-800 cards, blue-500 accents. Only `--accent-purple: #8B7EC8` is bespoke, and it's used for… AI. Lavender-for-AI is itself a 2024 cliché.

**Tell 2 — Plus Jakarta Sans.** `src/index.css:22`. Headings are Instrument Sans (`:23`), body is Plus Jakarta. There is no display face at all. Plus Jakarta + JetBrains Mono is the default "modern SaaS" pairing of the last three years. It reads as nobody's decision.

**Tell 3 — the sparkle.** `AIInsightCard.tsx:41` renders a `Sparkles` glyph *in addition to* a severity glyph on every single insight — two 14px icons stacked, one of which carries zero information because every card in the stack is an AI card. There are 2–3 of these per page across ~20 pages, plus sparkles in the top bar, in the "View AI Templates" row (`actions.png`), in a table column literally headed "AI" whose cell value is the word "AI" (`workflows.png`), and in the Engage table's trailing column (`engage.png`).

**Tell 4 — the tinted AI insight banner stack.** Every page opens with 1–3 full-width, low-contrast, softly-tinted banners with an icon on the left and a coloured link at the bottom (dashboard, actions, clients detail, portfolios, trading, engage). They consume 250–350px of vertical space *above the fold, on every page*, before any actual content. They are the first thing you see and the least useful thing on screen.

**Tell 5 — pill soup.** `actions.png` has five pills in one card row ("Tax Management", "Time-Critical", "Margaret Chen", plus "Critical"). `households.png` pills *data* — "2 members", "7 accounts" are values, not statuses. `prospects.png` has pills that wrap to two lines and blow the card layout apart. The brief's own rule ("nothing is pill-shaped except Tags and toggles") exists because this happens.

**Tell 6 — identical card grids.** `risk.png` is a 3×2 grid of six identical 490×115 tiles: label, number, nothing. Beta 0.92 *against what?* Sharpe 1.34 *versus what benchmark?* These tiles exist to fill a grid. `billing.png`, `models.png`, `reconciliation.png` each repeat the pattern with a *different* tile design — see §7.

**Tell 7 — a glowing floating action button.** `AnnotationFAB`, fixed bottom-right on every page, amber, with an **infinite `box-shadow` pulse** (`src/index.css:88-92`). It occludes real content on at least four screens (see §7).

**Tell 8 — the donut.** `client-detail.png` renders allocation as a donut whose two largest slices are two adjacent blues (US Equity / Intl Equity) that are indistinguishable at legend-swatch size, let alone for a deuteranope. The palette behind it (`src/lib/chart-colors.ts:1-12`) has **three near-identical blues** (`#2563EB`/`#3B82F6`/`#60A5FA`), **two ambers** (`#D97706`/`#F59E0B`), and a `#059669`/`#DC2626` pair doing categorical *and* semantic duty simultaneously — ten declared categories that collapse to five or six distinguishable buckets, fewer under CVD.

**Tell 9 — three different icons for one concept.** `Sparkles` (46 render sites across 22 files, at five different sizes), `Wand2` (once, `MeetingPrepModal.tsx:254`), and `Bot` (five files). Three metaphors for "AI", chosen ad hoc.

### The thing that is *not* generic — and where it lives

The one genuinely distinctive voice in this codebase is in the welcome overlay, and it never appears in the product:

> *"Fifteen years of opinions about what wealth management software gets wrong, distilled into a clickable prototype. Built in seven days, about ten hours of effort, and less than $100 in AI tokens."* — `WelcomeOverlay.tsx:85`

That is specific, confident, and memorable. Meanwhile the product itself speaks in flat institutional noun phrases ("Model portfolio versioning, change history, and propagation tracking"), and **only 3 of 27 pages have a subtitle at all** — the other 24 are a bare noun. The author has a point of view and has confined it to a splash screen.

### What would make it unmistakably itself

Four moves, in order of leverage:

1. **Commit to the warm/ink system that already exists in the brief.** Cream page, near-white card, espresso ink type, hairline rules instead of shadows, terracotta reserved *only* for advisory/AI. This isn't a token swap — it's a different product identity: the app stops looking like a dashboard and starts looking like *paper an advisor works on*. It also solves the AI-colour problem for free: if terracotta is the only warm accent and it exclusively means "the system is advising you," you can delete every sparkle icon in the app and lose no information.
2. **Make the Archive the spine, not a leaf route.** Every AI-generated artefact in the app — every insight, every draft email, every rebalance rationale — should carry a permanent link to its archive record showing the model, the timestamp, the WORM seal, and the advisor's disposition. "Every machine output in this product is a signed, immutable, reviewable record" is a memorable one-sentence pitch. "It has an AI panel" is not.
3. **Earn the density.** This is a *workstation*. Right now `workflows.png` shows 7 rows and 350px of empty grey; `households.png` gives each household a 92px card with ~900px of dead horizontal space; `rebalance.png` renders 41 accounts as 88px cards inside a card. Ship 44px rows, 12px cell padding, real column headers, and let the screen carry 25 rows. Density *is* the aesthetic in this category — it's what makes Bloomberg and Altruist look like tools rather than marketing sites.
4. **Kill the banner stack; put the intelligence in the data.** Instead of "14 Accounts Exceeding Drift Threshold" as a yellow box above the table, sort the table by drift and mark the band. The insight belongs *in* the row.

---

## 3. Screen-by-screen critique

### First: is the structure legible?

Mostly yes — 27 routes under 10 nav items is restrained, and the two-group sidebar (8 working destinations, then Workflows + Settings) reads correctly. Four structural problems:

- **`Trading` is both a top-level nav item and a child of `/portfolios`** (`Sidebar.tsx:26`, route at `routes.tsx:78`). Clicking Trading leaves Portfolios visually adjacent-but-inactive. Pick one.
- **`Clients` and `Households` are separate top-level destinations with heavily overlapping content**, and the file layout admits the confusion: `HouseholdListPage` lives in `features/households/` while `HouseholdDetailPage` lives in `features/clients/`. For an advisor the household *is* the unit of work; clients are members of it. This should be one destination with a toggle.
- **`Growth` is four unrelated things** — pipeline, revenue, book analytics, billing — sharing a nav item, and the page title changes identity across them ("Growth Pipeline" → "Practice Management" → no title → no title). `/growth/billing` is even authored in `src/features/billing/`.
- **The sidebar carries zero counts, dots or status.** Every count in the app lives on the page you have to visit to see it (page-title pills, tab pills, the topbar bell, the status bar). For a triage tool, the nav is the right place for "3 critical, 2 breaks, 1 NIGO".

### Dashboard (`dashboard.png`, `dashboard-dark.png`)

**Hierarchy — inverted.** The eye lands on "Good Evening, Sarah" (32px bold), then a 40px-tall KPI strip, then **three stacked tinted banners occupying y=350→690, i.e. 27% of the viewport**, before reaching the two things an advisor actually opens this page for (Next Best Actions, Schedule). The greeting is the largest type on a screen where it is the least useful information.

**A hard data bug, visible on screen.** Header: "Friday, July 24, 2026". Schedule panel: "**Wednesday, Feb 25**". The two dates on the same viewport are five months apart. A reviewer will assume everything else is fake too.

**Density.** The Schedule card is clipped at the viewport bottom mid-meeting ("Zoom" half-visible) with no scroll affordance or "+2 more". Next Best Actions is capped at 5 with "View all 20 actions →" — fine — but the two columns are different heights with no alignment relationship.

**What to cut:** the greeting line (or shrink it to 14px eyebrow); the "Portfolio Health Summary" banner, which restates the KPI strip directly above it ($91.3M appears twice within 100px); the breadcrumb bar, which on top-level routes contains one word already shown in the sidebar as the active item.

**What to elevate:** the alert count. "ALERTS 3 ↘ 1 critical" is a 13px label inside a divided strip and is the single most time-sensitive fact on the page.

### Actions (`actions.png`)

**"Next Best Actions" appears three times** — page h1, tab label, and card header — within 450px of vertical space. Textbook redundant-heading anti-pattern.

**Nested cards, three deep:** page card → action card → "View AI Templates" strip + footer action bar. Flatten it.

**Red has four different meanings in one card:** the "Time-Critical" pill, the word "Critical" top-right, "⏱ 15d remaining", and "Compliance deadline: 1d remaining". Fifteen days is not urgent; rendering it in the same red as a 1-day compliance deadline destroys the scale.

**Density is wrong for a queue.** Each action is a ~280px card. Twenty actions is 5,600px of scroll. This is a *work queue* — it wants a table with expandable rows, a persistent filter/sort bar, and bulk select. As built, an advisor cannot see their day.

**Cut:** the "Action Queue Summary" banner (it counts what the tab badge already counts); the "Margaret Chen" client pill (the client is already named in the title); one of the three greyed-out filter dropdowns.

### Clients (`clients.png`)

**The AUM column is left-aligned.** `$18.4M`, `$4.2M`, `$24.8M`, `$450K` — magnitudes don't line up, so the column cannot be scanned. Same for Phone. This is the highest-visibility craft failure in the app because it's on the most-visited screen.

**Orphaned state:** the header says 22, the table shows 11 rows, then just… stops. No pagination, no "showing 11 of 22", no infinite-scroll affordance.

**The columns don't earn their place.** Email and Phone consume a third of the table width for data an advisor scans approximately never. Missing: last contact, next review, drift, risk score, unrealised gains — the things this app computes elsewhere and that would make this table *the* daily surface.

**Composition:** a lone 560px search box floats with 1,000px of empty space to its right, and it duplicates the global search in the top bar and the ⌘K palette. Three search affordances for one job.

**Density:** ~76px rows. At 44px you'd see 22 clients without scrolling — the whole book on one screen. That's a demo moment.

### Client detail (`client-detail.png`)

**Nothing is primary.** Four header actions — "Generate Proposal" (grey), "Generate Report" (blue outline), "Workflow ▾" (dark fill), share icon — at three different visual weights with no clear winner. Pick one primary.

**The "AI Summary" card is the exact anti-pattern:** rounded rectangle with a thick purple border on one side, sparkle icon, and content that *restates what's already on screen* ("Robert Johnson is a Platinum client with $18.4M under management" — both facts are in the header card 400px above).

**Donut over stacked bar** — and the two blues are indistinguishable.

**Occlusion:** the FAB sits directly on top of "$10.0M target".

**Density/hierarchy:** two banners push the tab bar to y=607. The client's actual portfolio starts below the fold.

### Portfolios (`portfolios.png`, `portfolios-dark.png`, `portfolios-1280.png`)

**41 solid blue "Rebalance" buttons in one column.** The page's declared primary action ("Trade", top-right) is the same blue and is completely drowned. Row-level actions should be ghost/text, revealed on hover, or replaced by the checkbox column + one bulk action — which is what the checkboxes are *for*, except no bulk-action bar ever appears.

**Left-aligned Value and Drift columns.** Again.

**Row height is unstable:** the "Trust (Compressed)" badge wraps to two lines, making that row ~90px against ~60px for its neighbours. At 1280px, "Robert Johnson Individual" also wraps, so rows 1 and 2 differ in height. A data table with variable row height cannot be scanned.

**"Last Rebal" header wraps to two lines** and its sort arrow lands on the second line, misaligned with every other header.

**Four decorative badge colours in the Tax column** (grey / amber / green / purple) where the green "Tax Free" collides head-on with the positive/negative green used two columns to the right.

### Rebalance wizard (`rebalance.png`)

**Card-per-row inside a card.** Fourteen bordered 88px cards with 12px gaps where a 44px table would show 25 rows.

**There is no "select all", and no visible "Continue".** The subtitle says "0 accounts selected"; the wizard's entire purpose is batch selection; there is no bulk affordance and the step-forward control is somewhere below 41 cards of scroll. The primary action of a wizard must be in a sticky footer bar. As shipped, step 1 is a dead end.

**"drift" is printed 41 times.** That's a column header, not a cell value.

### Trading (`trading.png`)

**The Recent Orders table is clipped.** "submitted" and "cancelled" badges are cut off at the card's right edge; the bottom-most badge is cut by the FAB. This is at a 1600px viewport — not an edge case.

**Two different selected-state treatments on the same form:** Side/Buy = mint fill + green text; Order Type/Market = pale blue fill + blue text. Same control pattern, 200px apart, two designs.

**Green means three things within 400px:** "BUY" (side), "filled" (status), and positive performance elsewhere in the app.

**A raw native `<select>`** ("Select an account…") with the OS chevron sits among custom-styled controls.

**"Digital Assets" with a ₿ glyph** in a fiduciary trading blotter — off-register for the audience, and it's a second icon family alongside Lucide.

**Field sizing:** the Quantity input is 930px wide for a 3-digit number.

### Engage (`engage.png`)

The **best-executed table in the app** — 56px rows, hairline rules, honest truncation. Two problems:

- The trailing column is headed "**AI**" and its value is a sparkle icon on some rows and nothing on others. Undefined semantics, no legend, no accessible name.
- The Ch. / Dir. columns are icon-only with abbreviated headers, and direction is encoded by *colour + arrow angle* (green up-right = outbound, blue down-left = inbound) with no legend. Green here means "outbound"; that is the fourth meaning of green in this product.

### Workflows (`workflows.png`)

**28% of the viewport is empty grey.** Seven rows end at y=865; the page runs to 1210.

**"1 NIGO"** — a red pill of undefined, unclickable industry jargon in the page header. **"2 AI tasks active"** next to it as plain text with no affordance. Both are assertions the user can't act on.

**Half-finished completed state:** the finished row strikes through the title but leaves the description at full contrast, un-struck.

**"Today"** in the Due column is rendered in link-blue among mono dates. It is not a link, and it breaks the column's alignment.

### Risk analytics (`risk.png`)

**The loudest object in the entire product is a routine sensitivity ladder.** Fire-engine `#DC2626` and emerald `#059669` bars, 350px tall, 200px wide, at full saturation, for six data points. It reads as an emergency. The brief's whole thesis — calm, restrained, one accent at a time — is inverted here.

**Six context-free KPI tiles.** No benchmark, no target, no trend, no time window. `VaR (95%) $485K` in red is meaningless — VaR is *always* a loss figure; colouring it red is decoration.

**Hyphen-minus, not a true minus:** `-14.2%`, `-$950K`.

### Revenue / Practice Management (`revenue.png`)

**The headline chart is broken.** The blue Revenue line drops from ~$68K to $0 at month 04 and flatlines — almost certainly future months plotted as zero rather than omitted. In a demo about wealth management software, the revenue chart showing revenue going to zero is the worst possible bug.

**Four names for one place:** sidebar "Growth" → breadcrumb "Growth > Revenue" → h1 "Practice Management" → tab "Revenue".

**Duplicated data on screen:** "REVENUE GROWTH (YOY) **+8.30%** ↗ **+8.30%**".

**The numbers don't survive scrutiny:** TRR $800K, MTD $68K, YTD $135K. YTD is less than 2× MTD while TRR is $800K. An advisor will do that arithmetic in one second.

**Ordinal data, categorical colours:** platinum/gold/silver/bronze rendered as purple/orange/grey/blue in the bar chart and as lavender/amber/grey/blue in the table below it — a *partial* mismatch, which is worse than a total one. An ordinal scale wants a single-hue ramp.

**X axis reads "03 04 05 … 01 02 03 04 05"** with no year boundary marked.

### Book of business (`book.png`)

**The KPI strip overflows and is clipped mid-label** — "RETENTION 98.5%" then "HH…" cut at the container edge, no scroll.

**The waterfall is unreadable.** Market Appreciation, New Assets, Withdrawals and Attrition render as 3–8px slivers against a $0–$100M axis. A waterfall of $2M deltas on a $91M base needs a broken/zoomed axis or a different chart entirely.

**Rotated 30° axis labels** — the only rotated text in the app, on a chart with ample horizontal room.

**A formatting bug a financial reviewer will flag instantly:** the "% of AUM" column reads `+64.1%`, `+30.4%`, `+5.1%`, `+0.4%` — **signed pluses on a share-of-total**, in positive-green. A 0.4% share of AUM is not good news, and a share is never signed.

**Two instances of the same progress-bar component in two colours** (blue for Client Utilization, purple for Meeting Capacity) with no semantic reason. Each bar shows its value twice (`21 / 120` above-right and `17.5%` below-right).

### Reconciliation (`reconciliation.png`)

**No h1.** `ReconciliationPage.tsx` starts at h2 (`:88`).

**A 0.3pp difference triggers a colour change:** 99.7% green, 99.4% amber, 99.8% green — with no stated threshold anywhere.

**"Resolved Today: 1" in success-green** when 2 breaks remain open.

**A visible data contradiction:** both open breaks say "Detected **147d** ago" while the KPI above says "Avg Resolution **85m**".

**The primary action of the page is the weakest element on it.** "Mark Resolved" is mint-on-mint (`#059669` on `#D1FAE5` ≈ 3.2:1) — a button that looks like a disabled badge.

**Raw field names leak into the UI:** `goal_probability`, `cash_balance`.

**The Match Rate chart conveys nothing** — three near-identical lines pinned between 99.25% and 100% on a 97–100% axis.

### Growth pipeline (`prospects.png`)

**A whole column is clipped.** "Onboardi…" is cut at the viewport edge with no horizontal scroll affordance or edge fade.

**Badges wrapping inside pills destroy the layout.** "Cold Outreach" and "Existing Client" wrap to two lines, inflating their pills into 130px-tall rounded boxes that squeeze the prospect name into two lines. Card heights become arbitrary.

**Nested cards, three deep:** column → prospect card → "Next Action" inset.

**Icon-only phone/mail buttons at ~22px**, repeated ~10×, with no labels.

**The demo data undercuts the story:** Win Rate 10%, Avg Days in Stage 163d. That's a failing practice.

### Model governance (`models.png`)

**Colour is passing judgement it shouldn't:** Conservative = **blue** (the same blue as every interactive element), Moderate = green (= "good"), Aggressive = red (= "error"). Risk appetite is not a quality scale.

**Twenty-one repeated micro-labels.** Every row repeats "Accounts / AUM / Version" as 11px captions above its values. That's a header row, once.

**Five simultaneous status encodings on one row** (badge text + badge colour + a second badge + a 2px amber card border + position).

### Households (`households.png`)

**Ten different x-positions for the tier badge**, because the badge is inline after a variable-length household name. Tier is unscannable.

**Data rendered as pills:** "2 members", "7 accounts".

**Platinum is purple here and blue on the Clients page.** Same badge, same data, two colours, two screens.

**~900px of dead space per row**, and the FAB clips the last row's AUM to "$1…".

### Billing (`billing.png`)

**Numeric columns are correctly right-aligned here** — which is the proof that Clients and Portfolios are simply wrong, not constrained.

**"1 exceptions"** — pluralisation bug on screen.

**No h1** (`BillingPage.tsx`, first heading is h2 at `:325`).

**300px spent on three near-identical green stepper rows**, two of which are 100% complete and identical.

**Tab count style diverges:** "Exceptions (3)" in parentheses where every other tab in the app uses a separate count pill.

### Archive (`archive.png`) — the best screen

WORM badges, disposition tracking, named model attribution. Keep and promote. Faults:

- **The provenance is the least legible thing on the row.** "Claude Sonnet 4" sits in `--text-tertiary` (#94A3B8 ≈ **2.6:1** on white). The whole point of the screen is the audit trail; render it at full contrast.
- **The WORM badge starts at ten different x-positions** because it's inline after a variable-length title. Make it a column.
- Two adjacent unlabelled grey names ("Carlos Garcia   Emily Parker") — you cannot tell client from advisor.

### Command palette (`command-palette.png`)

**It opens empty.** The best single opportunity in this app to be memorable — and it shows a placeholder and an empty-state string that *repeats the placeholder almost verbatim*. It should open with recent clients, today's meetings, and the five highest-value commands, and it should teach the `>` syntax by showing it.

**The scrim doesn't cover the chrome.** The top bar and sidebar render at full brightness while the content region dims, so the modal doesn't read as modal.

**Redundant dismissal hints:** an "ESC" chip inside the field *and* "esc Close" in the footer.

---

## 4. The AI experience

**Verdict: bolted on, not woven in — with one exception that points the way out.**

### Where it undermines the seriousness of a financial tool

**It shouts before it says anything.** Every page opens with 1–3 tinted banners. Because they are always there, always first, and always the same shape, they become chrome — the exact opposite of an insight. And they are the *only* thing above the fold on Portfolios, Trading, Actions and Client detail.

**The insight component has no internal hierarchy.** `AIInsightCard.tsx:46-48`: the title and the body are the same element type, same size (`text-caption` = **12px**, `index.css:128`), same colour (`text-text-secondary`), differing only by `font-medium`. That is why the banners read as a wall of grey mush in every screenshot. A 130-character advisory paragraph is set two points *below* the interface default.

**Every AI call-to-action fails contrast.** `AIInsightCard.tsx:56` renders the action as `text-accent-purple` = `#8B7EC8` on white ≈ **3.55:1**, at 12px. "Draft Outreach", "Start Batch Rebalance", "Review Opportunities", "View Critical Actions", "Review Model Changes", "Filter Critical" — the app's entire AI action vocabulary is below WCAG AA.

**It restates what's on screen.** "Managing $91.3M across 47 accounts" sits 100px below a KPI reading `TOTAL AUM $91.3M`. "Robert Johnson is a Platinum client with $18.4M under management" sits below a header showing exactly that.

**No provenance, no confidence, no recourse.** The insight cards carry no source, no "as of", no confidence, no "why am I seeing this", no dismiss, no feedback. `AIInsightCard.tsx` has no dismiss handler at all. For a fiduciary product, an unfalsifiable, unremovable machine assertion is worse than none — the advisor is on the hook for it and has no way to interrogate or silence it.

**The confidence score exists, is computed, is user-weightable — and is never shown.** `src/types/nba.ts:23-24` documents it (`/** AI confidence in the recommendation (0-100) */`); every one of the 20 mock NBAs carries a value (`nbas.ts:9,27,42` — `88`, `98`, `99`); `NBASettingsTab.tsx:326` lets the advisor *weight confidence in the composite ranking*. **No card, feed, or list surfaces it.** The UI shows derived buckets ("Time-Critical", "This Week") and a 1–3 dot priority instead. The most trust-relevant number in the product is computed, configurable, and invisible.

**There is no undo. Anywhere.** Zero occurrences of `undo` or `revert` in `src/` or `e2e/`. And two of the three execution paths fire immediately with no confirmation: `ActionTemplateCard.tsx:177` `Execute` and `TradeSuggestionCard.tsx:39` `Execute Trade`. Only `ActionCard.tsx` has an Approve/Reject gate, and once it reads `Executed` (`:71`) there is no way back. An AI-native tool that executes trades irreversibly, without confirmation and without undo, is not a trustworthy AI tool — it's a demo of one.

**The product ships no disclaimer of its own.** The only disclaimer surface in the entire application is a blank free-text field the advisor must fill in themselves: `AISettingsTab.tsx:175-182`, placeholder *"Enter custom disclaimer text to include in generated proposals..."*. No limitations copy, no "verify before sending", no model-error framing.

**Provenance exists but is set at 9–11px in tertiary grey.** `ContextBriefing.tsx:74` "Based on data as of {date}" is `text-[9px]` — **the smallest type in the entire application**, on the line that establishes whether the advice is current. `NBACard.tsx:296` "AI-generated · {time}" is `text-[10px]`. `ChatBubble.tsx:47-67` has real citations (`{n} source(s)` → source/text pairs) at `text-[11px]`, collapsed by default. The app has built the right affordances and then whispered them.

**The autonomy model is genuinely good and completely hidden.** `settings/autonomy/PermissionMatrixCard.tsx` offers three modes per action — `auto_approve` / `queue_for_review` / `notify_and_hold` — plus data-access scope and execution schedule. `StandingRulesCard.tsx` and `DelegationRulesCard.tsx` add time/event-triggered rules and AI-vs-human routing, with per-rule `Last run` / `Next` / `{n} runs` telemetry. The explainer copy is precise and correctly hedged:
> *"Control what actions the AI can take autonomously, queue for your review, or hold for manual initiation."* — `PermissionMatrixCard.tsx:65-67`

This is the most differentiated AI thinking in the product. It is card four of tab one of a settings page, reachable only by someone who already believes it's there.

**The colour semantics are incoherent.** `AIInsightCard.tsx:34` puts a **purple** border on all three severities, then fills warning cards with `bg-amber-50`. So a warning renders as amber-inside-purple. Meanwhile purple also means "AI", "Alternatives" in the allocation donut, "medium" priority in Workflows, "Platinum" in Households, and "Meeting Capacity" in Book of Business. Purple means six things.

**The sparkle is doing no work.** Two icons per card (`AIInsightCard.tsx:41`), one of which is redundant by construction. Plus a sparkle in the top bar, in "View AI Templates", in a column *headed "AI"* whose value is the string "AI" (Workflows), and in Engage's trailing column.

**"NBA" leaks into user-facing copy as an acronym.** `BillingPage.tsx:200` "Create Consolidation NBA", `EngagePage.tsx:230`, the Settings tab labelled "NBA Settings" — while `ActionsPage.tsx:19` spells it out as "Next Best Actions". An internal abbreviation surfaced in three places in the UI.

**The AI's voice is split.** First person when it addresses you ("How can I help?", "Ask me anything about your clients…"), passive third person when it accounts for itself ("AI-generated"). Pick one. For a fiduciary tool the second is correct — the product should never speak as an "I".

**The default greeting is off-register.** `settings.png`: "Good morning! Here's your daily briefing." — an exclamation mark in a fiduciary tool, and it contradicts the dashboard's actual "Good Evening, Sarah".

**The greeting/schedule date mismatch has a root cause worth naming.** `DashboardPage.tsx:8-14` uses a live `new Date()` while four files pin a frozen clock — `NBACard.tsx:58` `const MOCK_NOW = new Date('2026-02-25T12:00:00Z')`, `tax/shared.tsx:6`, `MessagingContent.tsx:20`, `WorkflowCenterPage.tsx:94`. So the dashboard header reads "Friday, July 24, 2026" while every NBA countdown beneath it is computed from February. Every calendar event in the dataset is in the past (latest is `2026-03-01`), and **every NBA has expired** (`nbas.ts:19` `expiresAt: '2026-03-01T23:59:00Z'`) — the flagship AI feed is showing stale recommendations and doesn't know it. Two mock strings are now provably wrong on screen: `nbas.ts:144` says *"last reviewed on 2024-09-10 — over 17 months ago"* (it is 22) and `:121` says *"over 10 months ago"* (it is 15).

### The exception, and the fix

**The Archive is the trustworthy AI experience this product is looking for.** WORM seal + model name + advisor disposition (Approved / Edited / Rejected) is a *falsifiable, auditable* account of what the machine did and what the human did about it. That is exactly the register a compliance-bound advisor needs, and no competitor demo shows it.

Concretely:

1. **Surface the confidence score you already compute.** It's in the data (`nbas.ts`), it's in the settings weighting (`NBASettingsTab.tsx:326`), and it's the single cheapest change that moves the AI from "assertive" to "calibrated".
2. **Add undo,** or at minimum a confirm step on `ActionTemplateCard.tsx:177` and `TradeSuggestionCard.tsx:39`. Irreversible one-click AI trade execution is the one thing a compliance-minded reviewer cannot forgive.
3. **Promote provenance from 9px to 12px.** "Based on data as of…" and "AI-generated · …" should be legible, not apologetic.
4. Delete the sparkle from `AIInsightCard.tsx:41` and settle on one AI metaphor (`Sparkles`, `Wand2`, or `Bot` — not all three). Let the accent colour carry "this is advisory".
5. Give the insight a real hierarchy: 14px semibold title, 13px body at `--text-secondary`, mono metric, one action at ≥4.5:1.
6. Add to every insight: **an "as of" timestamp, a dismiss, and a link to its Archive record.**
7. Cap the stack at **one** insight per page, with "2 more" as a text link.
8. Move insights *into the data*. "14 accounts exceeding drift" is a sort order and a marked band on the Drift column, not a yellow box.
9. **Promote the autonomy model out of Settings tab one, card four** into a first-class "What the assistant may do without asking" screen, and reference it from every AI action.
10. Ship a real disclaimer instead of a blank field, and unfreeze the clock so the NBA feed isn't quietly serving five-month-old advice.

---

## 5. Accessibility audit

Severity: **Critical** = blocks a task or violates WCAG A · **High** = WCAG AA violation with real impact · **Medium** = AAA / quality / WCAG 2.2 AA target size · **Low** = polish.

| # | Issue | Location | Sev | Fix |
|---|---|---|---|---|
| A1 | **Sortable column headers are entirely keyboard-inoperable.** `<th onClick>` with `aria-sort` but no `tabIndex`/`onKeyDown`. Affects every table in the app. WCAG 2.1.1 | `src/components/ui/DataTable.tsx:78` (aria-sort `:87`) | **Critical** | Render header content as a `<button>` inside the `<th>`; keep `aria-sort` on the `<th>` |
| A2 | **Six modals bypass Radix entirely** — `fixed inset-0` divs with no focus trap, no focus restore, no scroll lock. Three of them also have no `role="dialog"`, no `aria-modal`, and no Escape handler. Keyboard/SR users are stranded behind the scrim. WCAG 2.1.2, 4.1.2 | `ReportGenerator.tsx:132`, `WorkflowStepEditor.tsx:107`, `DataQualityPanel.tsx:117` (worst three); also `QuickCaptureDialog.tsx:90`, `WelcomeOverlay.tsx:67`, `NotificationCenter.tsx:116` | **Critical** | Route all six through the existing `ui/Dialog.tsx` Radix wrapper |
| A3 | **`DialogContent` with no `DialogTitle`** — the known console warning. Only `aria-label="Command palette"` is set | `src/features/command-palette/CommandPalette.tsx:85` | **Critical** | Add `<VisuallyHidden><DialogTitle>Command palette</DialogTitle></VisuallyHidden>` |
| A4 | **d3 treemap tiles have `.on('click')` with no `tabindex`, no keydown, no role.** Bare `<svg>`, no name | `src/components/ui/TreemapChart.tsx:52, 106` | **Critical** | Add `<rect tabindex="0" role="button" aria-label>` + keydown, or a parallel data table |
| A5 | **`role="button"` applied to `<tr>`** destroys row semantics and orphans its `<td>` children from the grid | `src/components/ui/DataTable.tsx:129-140` | **High** | Keep `role="row"`; put the actuator in the first cell |
| A6 | **59 of 108 form controls have no accessible name.** Includes the shared `SelectField`/`SliderField` used across all Settings, all three page-level search inputs, and ~20 bare `<select>`s | `settings/settings-shared.tsx:84,102`; `ClientListPage.tsx:134`; `HouseholdListView.tsx:128,136`; `ArchivePage.tsx:164,172,182`; `RiskAnalyticsPage.tsx:106`; `NBASettingsTab.tsx:153,160,175,183` (+45 more) | **Critical** | Replace sibling `<span>` labels with `<label htmlFor>`; `aria-label` every bare select |
| A7 | **The Settings switch has no accessible name.** `<button role="switch" aria-checked>` containing only a decorative thumb `<span>`, inside a `<label>` — but `<label>` does not name a `<button>`. Used on every settings tab | `src/features/settings/settings-shared.tsx:61` (label `:59`) | **High** | Add `aria-labelledby` pointing at the label text node |
| A8 | **`--accent-green: #059669` on white = 3.77:1 — fails AA.** This is the positive/performance colour: every `+x.x%`, "Tax Free", "filled", "Approved", "OK", retention figures | `src/index.css:179`; visible in `dashboard.png`, `portfolios.png`, `book.png`, `archive.png` | **High** | Darken to ≈`#04785A` (4.6:1) or reserve green for ≥18px |
| A9 | **`--accent-amber: #D97706` on white = 3.19:1 — fails AA.** The warning colour: "Tax Deferred", `high`/`medium` priority, "Edited", "At Risk", "3 exceptions" | `src/index.css:183` | **High** | Darken to ≈`#8E6418` |
| A10 | **`--accent-purple: #8B7EC8` on white = 3.55:1 — fails AA.** Every AI call-to-action link in the app, at 12px | `src/index.css:181`; `AIInsightCard.tsx:56` | **High** | Darken to ≈`#6B5CA8` and raise the type to 13px |
| A11 | **`--text-tertiary: #94A3B8` on white = 2.56:1 — fails AA badly.** Used for all metadata: client names in Next Best Actions, "Conference Room A", account numbers `TRU-847291`, model attribution "Claude Sonnet 4", filter placeholders, footer | `src/index.css:177`; visible in `dashboard.png`, `archive.png`, `actions.png` | **High** | Darken to ≈`#64748B` (4.6:1) |
| A12 | **Dark `--text-tertiary: #64748B` on `--surface-primary #1E293B` = 3.04:1 — fails.** Dark `--text-secondary` and `--text-tertiary` are only ~1.5:1 apart, so the two-level hierarchy is invisible | `src/index.css:192-193` | **High** | Lighten tertiary to ≈`#8494AB`; widen the gap |
| A13 | **Dark `--accent-blue: #3B82F6` on card `#1E293B` = 3.94:1 — fails AA for link text; white-on-`#3B82F6` button labels = 3.67:1 — fails** | `src/index.css:194`; visible in `portfolios-dark.png` (41 Rebalance buttons) | **High** | Use `#60A5FA` for text-on-dark; keep `#2563EB` fill with white label |
| A14 | **Focus outline removed with no replacement on three primary text inputs** — the AI composer, the messaging composer, and the command palette search. `focus:outline-hidden` only. WCAG 2.4.7 | `AIChatPanel.tsx:307`, `MessagingContent.tsx:210`, `CommandPalette.tsx:95` | **High** | Add `focus-visible:ring-2 ring-accent-blue` |
| A15 | **~40 controls remove the outline and replace it with a 1px border-colour change only** — not perceivable at 3:1 against most fills. WCAG 1.4.11 | `settings/AISettingsTab.tsx:97,106,181,191`; `settings/autonomy/*`; `WorkflowStepEditor.tsx:131-231`; `ArchivePage.tsx:169` (+30) | **High** | Standardise on one `focus-visible` ring token |
| A16 | **`focus-visible` appears in only 3 files in the whole codebase.** Hundreds of raw `<button>`s declare `hover:` styles with no focus counterpart | `Button.tsx:29`, `Dialog.tsx:60`, `WelcomeOverlay.tsx:115` | **High** | Global `:focus-visible` rule in `index.css` (currently there is none) |
| A17 | **`accessibilityLayer` is used on zero of 15 Recharts roots.** All charts are keyboard-inert; every tooltip is hover-only. Only 1 of 17 charts has an accessible name | `AllocationChart.tsx:74` is the only compliant one; see `RiskAnalyticsPage.tsx:169,224`, `RevenuePage.tsx:127,150`, `ReconciliationPage.tsx:91,109`, `BookAnalyticsView.tsx:103,133,152` | **High** | Add `accessibilityLayer` + `role="img"` + generated `aria-label` to all |
| A18 | **`AllocationChart` legend items render as `disabled` `<button>`s when non-interactive**, removing the *text alternative* from the a11y tree | `src/components/ui/AllocationChart.tsx:118` | **High** | Render as `<li>` when not interactive |
| A19 | **Eight progress meters are bare divs** — no `role="progressbar"`, no `aria-valuenow`. Goal funding, data quality, model propagation, capacity | `GoalProgressCard.tsx:48`, `DataQualityPanel.tsx:43`, `ModelGovernancePage.tsx:127,240`, `WorkflowCenterPage.tsx:181`, `BookOfBusinessPage.tsx:147,162` | **High** | Add role + aria-value* |
| A20 | **15 icon-only buttons with no accessible name.** `lucide-react` sets `aria-hidden` by default, so these announce as "button" with nothing else. Includes every back arrow and every close X outside Radix | `AccountDetailPage.tsx:158`, `TaxManagementPage.tsx:184`, `AttributionPage.tsx:76`, `RebalancePage.tsx:163`, `ReportGenerator.tsx:140`, `QuickCaptureDialog.tsx:102`, `WorkflowStepEditor.tsx:117,173,183,245`, `NBAFeed.tsx:268`, `MessagingContent.tsx:142`, `MessagingSidebar.tsx:25`, `DataQualityPanel.tsx:128` | **High** | `<span className="sr-only">` — the pattern already exists at `Dialog.tsx:60-63` |
| A21 | **The AI panel's resize handle has `role="separator"` and `aria-label` but is not focusable and has no keyboard handler** — and no `aria-valuenow`/`min`/`max`. It announces as resizable and cannot be resized. WCAG 2.1.1 | `src/features/ai-assistant/AIChatPanel.tsx:191-201` | **High** | `tabIndex={0}` + arrow-key handler + aria-value* |
| A22 | **`DataTable`'s scroll container has `overflow-auto` and no `tabIndex={0}`** — keyboard users cannot scroll a horizontally-overflowing table. WCAG 2.1.1 | `src/components/ui/DataTable.tsx:71` | **High** | `tabIndex={0}` + `role="region"` + `aria-label` |
| A23 | **Global keyboard shortcuts have no target guard.** `Alt+1..9` navigates away even while the user is typing in a textarea (e.g. composing an email). Loses work | `src/components/layout/AppShell.tsx:68-75` | **High** | Bail when `e.target` is an input/textarea/contenteditable |
| A24 | **`--border-primary: #DEE5EE` on white = 1.2:1** — well below the 3:1 non-text minimum, and it is the default border for *every* control via the `* { border-color }` rule | `src/index.css:173`, applied `:202-204` | **High** | Use `#C4CFDB` (already defined as `--border-secondary`) for control borders |
| A25 | **Three `<aside>` landmarks are unnamed** — SR users hear three identical "complementary" regions | `AIChatPanel.tsx:186`, `MessagingSidebar.tsx:17`, `Sidebar.tsx:42` | **Medium** | `aria-label` each |
| A26 | **Four pages have no `h1`**, so the document has zero h1 on those routes | `BookOfBusinessPage.tsx` (h2 `:212`), `BillingPage.tsx` (h2 `:325`), `ReconciliationPage.tsx` (h2 `:88`), `OnboardingWizard.tsx` (starts h3) | **Medium** | Add page h1 |
| A27 | **Nine pages skip heading levels** (h1→h3, h2→h4). `CardHeader` hardcodes h2 across all 145 usages despite exposing an `as` prop that is never used | `Card.tsx:28-31`; `EngagePage.tsx:465→220`, `TradingPage`, `ProposalWizard.tsx:121`, `HouseholdListPage.tsx:15`, `ClientDetailPage.tsx:209`, `ModelGovernancePage.tsx:103` | **Medium** | Pass `as` where nesting demands it |
| A28 | **`StatusBar` injects an h3+h4 into every page** including the h1-less ones, via `DataQualityPanel` | `StatusBar.tsx:63` → `DataQualityPanel.tsx:123,167,208` | **Medium** | Demote or scope |
| A29 | **18 icon buttons under 24×24px** — fails WCAG 2.2 AA (2.5.8). Worst: the AI insight action arrow (~12px) and the MultiSelect chip remove (~12px) | `AIInsightCard.tsx:54`, `MultiSelect.tsx:128`, `ProspectsPage.tsx:82,89`, `WorkflowStepEditor.tsx:173,183,245`, `NBACard.tsx:350`, `TemplateLibraryEditor.tsx:186,193,200`, `TemplatesPromptsTab.tsx:163,170`, `NBASettingsTab.tsx:226`, `AnnotationPanel.tsx:175`, `MessagingContent.tsx:194`, `NotificationCenter.tsx:290` | **Medium** | 24px minimum hit area; 32px preferred for a desktop tool |
| A30 | **A further 19 controls sit at 24–31px**, including the app-wide `SegmentedControl` (~28px) and the DataTable expand chevron (20px) | `SegmentedControl.tsx:19`, `DataTable.tsx:144` (+17) | **Medium** | Raise to 32px |
| A31 | **~45 inline `animate-spin` loaders have no `role="status"` and no accessible text.** Async state is silent to SR users | `ProposalWizard.tsx:158,182`, `MeetingPrepModal.tsx:166,210,305,316,447`, `ReportGenerator.tsx:208,229`, `BatchActionModal.tsx:157`, `NBACard.tsx:230` (+35) | **Medium** | Wrap in `role="status"` with sr-only text |
| A32 | **`EmptyState.tsx` exists and is never imported.** Every empty state is an ad-hoc `<p class="text-caption text-text-tertiary">` or a `DataTable emptyMessage` string — no icon, no description, no recovery action, none announced | `src/components/ui/EmptyState.tsx`; `DataTable.tsx:115` | **Medium** | Adopt it; every empty state should teach the next action |
| A33 | **17 of 24 pages have no error state.** Five pages have no loading state either (`DashboardPage`, `HouseholdListPage`, `RebalancePage`, `TradingPage`, `SettingsPage`). One root ErrorBoundary, mounted *outside* `QueryClientProvider`, so any render error blanks the whole app; 19 of 25 routes have no `errorElement` | `main.tsx:35-40`; `routes.tsx:40,48,60,69,84,96` | **Medium** | Per-route boundaries + `QueryErrorBanner` everywhere |
| A34 | **`scrollIntoView({ behavior: 'smooth' })` is not gated by reduced-motion.** The CSS `scroll-behavior: auto !important` reset does **not** override the JS option | `AIChatPanel.tsx:154` | **Medium** | Read the media query in JS and pass `'auto'` |
| A35 | **Two infinite `box-shadow` animations run forever** on always-visible elements (the FAB and annotation hotspots). WCAG 2.2.2 (moving content > 5s) and paint-expensive | `src/index.css:82-92`; `AnnotationFAB.tsx` | **Medium** | Pulse three times, then stop |
| A36 | **Colour is the sole encoding on every semantic chart.** Only 2 of 17 charts use a second channel (`strokeDasharray`) | `RevenuePage.tsx:133`, `PerformanceTab.tsx:37` are the only two; `risk.png` red/green bars are the worst case | **Medium** | Add pattern/label/direct annotation |
| A37 | **`contrastTextColor()` is not WCAG-correct** — NTSC/YIQ formula with no gamma linearisation and an arbitrary 0.55 threshold. `#D97706` lands on the boundary; treemap tiles are further reduced to 0.75 fill opacity and 0.7–0.8 label alpha, so 11px mono labels on tiles are likely hard failures | `src/lib/chart-colors.ts`; `TreemapChart.tsx:62,83-86` | **Medium** | Use relative luminance per WCAG 2.x |
| A38 | **`system` theme mode never updates live.** `prefers-color-scheme` is read once at module load with no `change` listener | `src/store/ui-store.ts:49-57` | **Low** | Subscribe to the MQL |
| A39 | **Invalid CSS colour** — `var(--hotspot-color, #8B7EC8)66` concatenates an alpha suffix onto a `var()`, which does not parse | `src/index.css:83-85` | **Low** | Use `color-mix()` or an rgba var |
| A40 | **`accent-yellow` is an undefined utility** — the Archive "Edit Summary" callout renders with transparent border, no background and **invisible text** (0:1 contrast) | `src/features/compliance/ArchivePage.tsx:34-35` | **Critical** | Define the token or use `--accent-amber` |
| A41 | **`text-h2`/`text-h3` are undefined utilities** used at 8 sites — those headings render at browser-default size, breaking the visual heading hierarchy in both wizards | `ProposalWizard.tsx:121`, `FinalizeStep.tsx:38`, `DocumentsStep.tsx:17`, `RiskProfileStep.tsx:32`, `ClientInfoStep.tsx:21`, `AccountSetupStep.tsx:28`, `ReviewStep.tsx:19`, `OnboardingWizard.tsx:147` | **High** | Define in `index.css` alongside the other `@utility` blocks |
| A42 | **The AI panel covers the top bar.** `fixed right-0 top-0 bottom-0 z-40` over a `z-20` header, with no `role="dialog"`/`aria-modal` and no focus trap in overlay mode, and no Escape handler — global search and theme toggle become unreachable | `AIChatPanel.tsx:186`; backdrop `:180` | **High** | Start the panel below the topbar; add `aria-modal` + focus trap + Escape in overlay mode |
| A43 | **Irreversible AI execution with no confirmation and no undo.** `Execute` and `Execute Trade` fire immediately; zero occurrences of `undo`/`revert` in `src/`. No wizard has a Cancel or an unsaved-changes guard | `ActionTemplateCard.tsx:177`, `TradeSuggestionCard.tsx:39`, `ActionCard.tsx:71`; `RebalancePage.tsx`, `OnboardingWizard.tsx`, `ProposalWizard.tsx` | **High** | Confirm step + undo window; add Cancel to all three wizards |
| A44 | **Failed queries fail silently on 17 of 25 pages** — `retry: false` with a `MutationCache.onError` and no `QueryCache.onError`. No toast, no banner, no retry | `src/main.tsx:10-22` | **High** | Add `QueryCache.onError` |

**Counts:** 7 Critical · 24 High · 12 Medium · 3 Low (**46 accessibility & resilience findings**), plus ~55 design, craft and data-integrity findings in §2, §3, §6 and §7.

### Positive findings (keep these)

- **Skip link, correctly implemented** — `AppShell.tsx:85-90`, `sr-only focus:not-sr-only`, targets a real `#main-content`.
- **All six landmarks present and mostly labelled** — `main`, `header`, two named `nav`s, `aside`, `footer`.
- **Global `prefers-reduced-motion` block** — `index.css:256-265`, covers `*`, `::before`, `::after`, and neutralises all three infinite animations.
- **The command palette's ARIA pattern is genuinely well-formed** — `role="combobox"` + `listbox` + `option` + `aria-activedescendant` (`CommandPalette.tsx:98,101,113,133`). It only lacks the title.
- **`TradeTicketDialog`** is the one fully compliant dialog (title + description + `role="status"` + `role="alert"`), and **`AllocationChart.tsx:67-74`** is the one chart with a generated accessible name. Both are ready-made internal templates.
- **`PageSkeleton.tsx:5`** carries `aria-busy` + `aria-label` correctly.
- Keyframes are compositor-friendly (`transform`/`opacity`) apart from the two pulses.
- `<html lang="en">` set; sonner ships its own live region so toasts are announced.

---

## 6. Theming & responsive

### Dark mode — evaluated seriously, it is an inversion, not a design

**It's the same cool ramp flipped.** `#0F172A` page / `#1E293B` card / `#334155` tertiary — three near-identical dark blue-greys with almost no perceptual separation. In `dashboard-dark.png` the sidebar and the page background are effectively the same value; the shell loses its structure. Depth in dark mode has to be *re-authored*, not inverted.

**Semantic tint collapses.** In `portfolios-dark.png` the "14 Accounts Exceeding Drift Threshold" banner reads as muddy brown and the "Model Update Available" banner is indistinguishable from the card surface. `index.css:222-248` patches this with 20 hand-written `[data-theme="dark"] .bg-amber-50 { … }` overrides at 10–15% alpha — which is why the tints are too weak to carry meaning. The patch layer is itself the smell: hardcoded Tailwind palette classes leaked past the token system and are being chased one class at a time. Chart hex values (`NBAEffectivenessContent.tsx:75,76,94,95`; `RiskTab.tsx:11`) aren't covered at all and will not adapt.

**Checkboxes disappear.** In `portfolios-dark.png` the row checkboxes and the "Drifted only" checkbox are dark-grey squares on a dark surface with no perceptible border.

**Contrast regressions** — A12, A13 above. Notably, the 41 "Rebalance" buttons in `portfolios-dark.png` render white-on-`#3B82F6` = **3.67:1**, failing AA for the app's most-repeated control.

**Muted text is unreadable.** "47 accounts", "Conference Room A", "Office — Main", "Reference Design by Joel Lewis", "Concept v1" — all `--text-tertiary #64748B` at 3.0:1 on cards.

**Badge fills vanish.** In `dashboard-dark.png` the "This Week" pills lose their fill and become outlined amber text, so they read as a different component from their light-mode selves.

**One real bug:** `system` mode reads `prefers-color-scheme` once at module load and never re-reads it (`ui-store.ts:49-57`). Change your OS theme and the app doesn't follow.

### Responsive — the claim is 1024–1920+; it breaks well inside that

**At 1600px (the width every screenshot was taken at) three things already clip:**
- `trading.png` — Recent Orders status badges cut at the card edge.
- `book.png` — the KPI strip clipped mid-label, "HH…".
- `prospects.png` — the fifth kanban column cut mid-word, no scroll affordance.

**At 1280px** (`portfolios-1280.png`) the app contradicts its own documented contract. `use-breakpoint.ts:9-12` says *"1280–1535px — default sidebar collapsed"*, but the auto-collapse in `AppShell.tsx:34-39` only fires when `isBase` (i.e. **below** 1280). At exactly 1280 the sidebar stays at 240px — 19% of the viewport — and the screenshot confirms it. Consequences visible in the shot: "Robert Johnson Individual" wraps to two lines while row 1 doesn't, so row heights diverge; "Last Rebal" still wraps; the FAB overlaps the last-rebal date cell.

**The real cliff is the AI panel.** Chrome tokens (`index.css:27-33`): sidebar 240, AI panel 400 default, resizable to 800. At 1280 with the panel open and pushing (it only overlays below 1280):

| State | Chrome | Content | Usable after `p-6` |
|---|---|---|---|
| Panel closed | 240 | 1040 | 992px |
| **Panel open @ 400 (default)** | **640 — 50% of the viewport** | 640 | **592px** |
| Panel @ 600 (wide toggle) | 840 | 440 | 392px |
| Panel @ 800 (max drag) | 1040 | 240 | **192px** |

At 592px usable, four charts declaring `min-w-[700px]` overflow by ~110px (`NBAEffectivenessPage.tsx:120,134`, `NBAEffectivenessContent.tsx:108,122`), and `ReportGenerator.tsx:133` is a fixed `w-[900px]` modal — **wider than the content area it opens over**. `DataTable.tsx:71` is `overflow-auto` with no `min-width`, so tables compress and then clip rather than scroll (this is exactly what `portfolios-1280.png` shows).

**The upper bound is worse than the lower bound: there is no content max-width anywhere in the app.** The layout brief specifies 1180px; `AppShell.tsx:109` applies `p-6` and nothing else. Only the two wizards constrain (`mx-auto max-w-3xl`, `ProposalWizard.tsx:112`, `OnboardingWizard.tsx:192`). On a 27" 2560px display every table row, every KPI strip and the dashboard grid stretch edge to edge — line lengths of 200+ characters in the AI insight banners, and a Clients table with 300px of whitespace between "Tier" and "AUM". The app claims 1920+ support; at 1920+ it simply gets emptier. This is a bigger craft failure than the 1280 case because it is the width a reviewer on a nice monitor will actually use.

**Nothing adapts, it only shrinks.** No `@container` queries anywhere. The 9-column Portfolios table is the same 9 columns at 1280 as at 1920; the kanban is the same 5 columns; the 3×2 KPI grid never reflows to 2×3.

**Two chrome tokens are dead.** `--spacing-ai-panel: 400px` and `--spacing-ai-panel-wide: 600px` (`index.css:32-33`) are defined and never referenced — the panel width lives as a zustand number instead. Meanwhile four fixed-position elements (`Sidebar.tsx:44`, `TopBar.tsx:34-37`, `BreadcrumbBar.tsx:89`, `StatusBar.tsx:24-27`) each independently re-derive the same left/right offsets from the same two store values: four places to keep in sync, and the reason the chrome can drift.

**Ad-hoc z-index.** sidebar `z-30`, topbar `z-20`, breadcrumb/status `z-10`, AI panel `z-40`, dialogs `z-50`, plus arbitrary `z-[45]`, `z-[48]`, `z-[55]`, `z-[60]` in the annotation/welcome layer. No scale, and the AI panel at `z-40` sits above the topbar at `z-20` while covering it (`fixed right-0 top-0 bottom-0`), so the global search and theme toggle are unreachable whenever the panel is open at base breakpoint.

**Layout properties are animated.** The sidebar toggle animates **five elements' box geometry at once**: `Sidebar.tsx:44` `transition-[width]`, `AppShell.tsx:101` `transition-[margin]`, and `transition-[left,right]` on `TopBar.tsx:34`, `BreadcrumbBar.tsx:89`, `StatusBar.tsx:24`. That's a full-page reflow every frame for 200ms, plus 12 `transition-all` sites.

**Fixes:** move the auto-collapse to `!is2XL` so 1280–1535 collapses as documented; give `DataTable` a `min-width` and a scroll region; cap the AI panel at `min(400px, 35vw)` and force overlay mode below 1536; make `ReportGenerator` `max-w-[min(900px,calc(100vw-2rem))]`; drop column sets at 1280 (Email, Phone, Custodian, UMA) rather than compressing them; animate `transform` on the sidebar instead of `width`.

---

## 7. Craft inventory

### The design system exists and is bypassed

This is the group that will do the most damage with a reviewer who opens the repo.

- **`Button.tsx`, `EmptyState.tsx` and `FilterBar.tsx` are fully authored components with zero imports.** Meanwhile there are **278 hand-rolled `<button>` elements across 103 files**, and the primary blue button alone ships in **eight padding/size combinations**: `px-3 py-1.5 text-caption` (×10), `px-4 py-2 text-caption` (×7), `px-6 py-2 text-body` (×6), `px-4 py-2 text-body` (×5), `px-4 py-1.5 text-caption` (×4), plus `px-4 py-2.5`, `px-3 py-2`, `px-3 py-1`. A `SAVE_BUTTON_CLASS` constant was extracted — for settings only.
- **`text-h2` and `text-h3` are used at 8 sites and defined nowhere.** Those headings render at browser-default size. All eight are in the wizards: `ProposalWizard.tsx:121`, `FinalizeStep.tsx:38`, `DocumentsStep.tsx:17`, `RiskProfileStep.tsx:32`, `ClientInfoStep.tsx:21`, `AccountSetupStep.tsx:28`, `ReviewStep.tsx:19`, `OnboardingWizard.tsx:147`.
- **`accent-yellow` is undefined and used at `ArchivePage.tsx:34-35`** — the "Edit Summary" callout renders with a transparent border, no background and invisible text.
- **The token file has no radius, shadow, elevation, z-index or sub-12px type scale.** Consequences: 12 distinct radii across 465 usages with three competing "defaults" (`rounded-md` 273 / `rounded` 127 / `rounded-lg` 91); 8 shadow values across 39 usages including three arbitrary one-offs; and **122 arbitrary font sizes** (`text-[10px]` ×71, `text-[11px]` ×46, `text-[9px]` ×2) because there is no token below 12px — note that `text-mono-sm` *is already 11px*, so the 46 `text-[11px]` uses re-implement an existing token.
- **90 hard-coded hex literals (30 distinct) plus 16 rgb/rgba**, and the six most-repeated (`#94A3B8` ×17, `#8B7EC8` ×11, `#2563EB` ×9, `#D97706` ×6, `#DC2626` ×5, `#059669` ×5) **all already exist as CSS variables**. Plus ~240 raw Tailwind palette classes bypassing tokens entirely — which is precisely why the 20-rule dark-mode patch block at `index.css:222-248` has to exist.
- **Three separate step-indicator implementations** with different circle sizes and connector widths: `rebalance/StepIndicator.tsx`, `OnboardingWizard.tsx:194-217`, `ProposalWizard.tsx:128-151`. The last two are copy-paste twins down to an identical `stepIndicatorStyle()` helper.
- **`NBAEffectivenessPage.tsx` is an unrouted duplicate** of `NBAEffectivenessContent.tsx`, byte-identical down to the chart hex literals.
- **Badge semantics reinvented in ≥12 files** (`SEVERITY_COLORS`, `CATEGORY_COLORS`, `STATUS_COLOR`, `RATING_COLORS`, `MODE_COLORS`, `ROLE_COLORS`, `PROFILE_COLORS`, `DELEGATION_TYPE_BADGE`, `DISPOSITION_CONFIG`, `CHANGE_TYPE_COLORS`…) despite `Badge.tsx` offering six variants.

### Wizards

- **No wizard has a Cancel or Exit affordance.** Not Rebalance, not Onboarding, not Proposal. No draft save, no unsaved-changes guard. Combined with the total absence of undo, `Execute` in the rebalance wizard is a one-way door with no marked exit.
- **`ProposalWizard` has two Back buttons on the same screen** — a header `← Back` (`:115-120`) and a footer `Back` (`:168-174`).
- `RebalancePage` has no wizard-level Back at all — just a browser-history arrow (`:163`); each step owns its own.

### Error and loading behaviour

- **Failed queries fail silently on 17 of 25 pages.** `main.tsx:10-16` sets `retry: false`, and `main.tsx:17-22` installs a `MutationCache.onError` toast with **no `QueryCache.onError` counterpart**. A failed query on a page without an explicit `isError` branch produces no toast, no banner, no retry — just permanently empty content.
- **`RebalancePage.tsx` — the most consequential irreversible flow in the app — fires three live queries (`:32-34`) and handles none of loading, empty or error.** A slow or failed fetch renders an empty wizard shell.
- `PageSkeleton` runs first, then each page hand-rolls its own bespoke skeleton (~15 different layouts) — a visible layout shift on every navigation.
- **MSW ships in the production build.** `main.tsx:25-30` has no `import.meta.env.DEV` guard, and `onUnhandledRequest: 'bypass'` means uncovered routes 404 silently.

### Demo data integrity

The persona set is genuinely strong — 22 named clients with varied ethnicity and DOBs 1948–1990, real metros with correctly matched area codes, the reserved `555-01XX` fictional block, distinct AUM values, and non-repetitive prose in `nbas.ts` / `archives.ts`. No lorem ipsum, no "Client A". These specific defects are worth fixing because the surrounding quality makes them stand out:

- **The whole dataset is frozen at 24 Feb 2026** (`2026-02-24` ×55, `2026-02-25` ×42) — five months stale. Every calendar event is in the past; every NBA has expired.
- **Four conflicting AUM totals** (see §1). `practice.ts` `aumByAccountType` is five perfectly round numbers plus `Other: 4,855,000` as the plug — visibly invented on a bar chart.
- **A past-due, underfunded goal marked `on_track`** — `planning.ts:8`: Retirement Income, `targetDate: '2023-03-22'`, `14.2M` of `15M`, `status: 'on_track'`, `probability: 0.92`. This is the goal rendered as "92% On Track" in `client-detail.png`.
- **The protagonist's identity is incoherent.** Sarah Mitchell appears 51× and the firm is "Mitchell Wealth Advisors", but `practice.ts:7` gives her the role `'csa'` (client service associate) while `prospects.ts` lists her as `assignedAdvisor` on all ten prospects. `archives.ts` is authored entirely by **James Mitchell (×12) and Emily Parker (×5), neither of whom exists in `practice.ts`** — which is why `archive.png` shows two unexplained grey names per row. `archives.ts:117` references *"Robert & Linda Williams"*, a copy-paste chimera of two different households.
- **`@email.com` ×22 across 11 clients** sits beside good addresses in the same file (`margaret.chen@techventures.com`, `hans.mueller@mueller-ag.ch`).
- **Real brands and a loss claim about a named public company.** Vanguard ×60, iShares ×46, Schwab ×39, Fidelity ×24, Merrill, UBS, JPMorgan, Goldman, Morgan Stanley, DocuSign, Salesforce, Orion, Zoom — and `nbas.ts:24` *"Intel (INTC) is down 18% from cost basis."* Naming competitors and making specific loss claims about real securities in a public demo is an avoidable risk with no upside.
- **7 financial plans for 22 clients** — 15 clients have an empty planning tab, and there's no empty state to explain why.
- **Team members: 4. Messages: 5.** Thin enough that the messaging and delegation features look unfinished.

### Numbers and financial formatting

- **Left-aligned numeric columns** — `clients.png` (AUM, Phone), `portfolios.png` (Value, Drift), `workflows.png` (Due), `engage.png` (Date). `billing.png` gets it right. Root cause: `DataTable.tsx:158-163` — the `<td>` has no numeric alignment affordance at all; right-alignment is per-column and ad hoc.
- **`tabular-nums` / `font-variant-numeric` / `slashed-zero`: zero occurrences in the entire codebase.** Alignment relies entirely on `font-mono`, and `CurrencyValue.tsx:36` — the app's primary currency renderer — emits a bare `<span className={className}>` with **no default font class**. It's tabular only when a caller happens to pass `font-mono` (as `account-detail/columns.tsx` does). `ClientDetailPage`, `HouseholdDetailPage`, `PortfolioPage`, `RichCard` and `MetricsBar` pass nothing → proportional Plus Jakarta digits in currency columns.
- **Hyphen-minus instead of a true minus (−)** — `risk.png`: `-14.2%`, `-$950K`.
- **Signed percentages on a share-of-total** — `book.png` "% of AUM" reads `+64.1%`, `+30.4%`, `+5.1%`, `+0.4%`, in positive-green.
- **Duplicated figure** — `revenue.png` "REVENUE GROWTH (YOY) +8.30% ↗ +8.30%".
- **Internally inconsistent demo data** — `revenue.png` TRR $800K / MTD $68K / YTD $135K; `reconciliation.png` "Detected 147d ago" vs "Avg Resolution 85m"; `dashboard.png` "Friday, July 24, 2026" vs schedule "Wednesday, Feb 25".
- **Pluralisation bug** — `billing.png` "1 exceptions".

### Alignment and optical spacing

- **Inline badges create ragged columns.** Ten x-positions for the tier badge in `households.png`; ten for the WORM badge in `archive.png`; ten for the risk badge in `models.png`. All three should be fixed columns.
- **Badges that wrap break their own geometry** — `prospects.png` "Cold Outreach" / "Existing Client" inflate into 130px rounded boxes and squeeze the name into two lines.
- **Variable row height inside one table** — `portfolios.png` ("Trust (Compressed)" at ~90px vs ~60px neighbours); `portfolios-1280.png` (wrapped account names).
- **Two-line header with a first-line sort arrow** — "Last Rebal" in `portfolios.png`.
- **Clipped textarea** — `settings.png`, the Email Signature field cuts the fourth line horizontally through the glyphs.
- **Native `<select>` elements at three different widths, right-aligned** so their left edges are ragged — `settings.png`. Native OS selects also appear in `trading.png`, `risk.png`, `households.png`, `archive.png` ×2, sitting beside custom controls.

### Consistency of the system

- **Five different KPI-tile designs across five pages**: divided strip (dashboard, portfolios, book), left-aligned bordered cards (risk), centre-aligned bordered cards (reconciliation), label+value+em-dash-caption cards (models), plain label+value cards (billing). Same data role, five components.
- **Three different segmented-control styles**: bordered container with blue-filled segment (`portfolios.png`), bare text row with one blue pill (`risk.png`), outlined pill toggles (`settings.png`). Plus `SegmentedControl.tsx` exists.
- **Two selected-state treatments on one form** — `trading.png` Side vs Order Type.
- **Two tab-count treatments** — count pills everywhere vs "Exceptions (3)" in `billing.png`.
- **Casing is uncontrolled**: Title Case headings ("Next Best Actions", "Portfolio Health Summary"), lowercase pills ("high", "critical", "filled", "pending", "low", "platinum", "aum based"), and one all-caps pill ("OK" in `billing.png`) coexist. The brief specifies sentence case throughout.
- **Colour semantics collide**: green = positive, "Tax Free", "BUY", "filled", "outbound", "Moderate risk", "Approved", "Mark Resolved". Blue = interactive, "Platinum", "medium priority", "Conservative risk", "bronze segment", "inbound". Purple = AI, "Alternatives", "Platinum" (households), "medium", "Meeting Capacity". **Platinum is blue on `clients.png` and purple on `households.png`.**
- **`SEGMENT_COLORS` is triplicated and has drifted** — `BookAnalyticsView.tsx:15`, `BookOfBusinessPage.tsx:14`, `RevenuePage.tsx:28`. `ModelGovernancePage.tsx:41` is a fourth, conflicting palette in which `digital_assets` and `private_equity` are **both `bg-purple-500`**.
- **The chart palette collides with itself** — four of ten categories are blue/cyan (`#2563EB`/`#3B82F6`/`#60A5FA`/`#0891B2`); `#D97706` and `#F59E0B` are both amber; `#059669`/`#DC2626` do categorical *and* semantic duty simultaneously (`src/lib/chart-colors.ts`).
- **Ordinal data with categorical colour** — platinum/gold/silver/bronze as purple/orange/grey/blue; funnel stages as grey/blue/purple/orange/green. Both want single-hue ramps.
- **Twelve Radix packages installed, one imported.** `avatar`, `collapsible`, `dropdown-menu`, `popover`, `scroll-area`, `select`, `separator`, `slot`, `tabs`, `tooltip` are dead dependencies — and every menu, popover, select, tab, tooltip and switch in the app is hand-rolled from divs. That is the root cause of most of §5.

### Orphaned and half-finished states

- **Checkbox column with no bulk-action bar** — `portfolios.png`.
- **Selection wizard with no "select all" and no visible "Continue"** — `rebalance.png`.
- **11 of 22 rows shown, no pagination** — `clients.png`.
- **Half-applied completed state** — `workflows.png`: title struck through, description not.
- **Undefined column** — `engage.png` header "AI", value = a sparkle on some rows.
- **Unexplained badge** — `workflows.png` "1 NIGO" with no tooltip or link.
- **Command palette opens empty**, and its empty-state string repeats its own placeholder.
- **`EmptyState.tsx` is defined and never imported.** No empty state anywhere has an icon, a description, or a recovery action.
- **`textarea`/`select` content truncation** with no "show more" — `settings.png`, `engage.png` (summary column cut mid-word).

### The annotation FAB

`AnnotationFAB` renders on every page at fixed bottom-right with an infinite amber pulse. It **occludes real content** on at least four screens: `client-detail.png` (the "$10.0M target" label), `households.png` (the last row's AUM, cut to "$1…"), `trading.png` (a status badge), `portfolios-1280.png` (a date cell). For a portfolio piece, an author-annotation layer is a legitimate and even charming idea — but it must sit in the page gutter or a corner reserved by padding, must not pulse forever, and must not cover data. Right now it reads as an unfinished floating widget.

### Miscellaneous

- **The persistent footer** ("Reference Design by Joel Lewis · ⚠ 2 breaks · joelelewis.com · Concept v1") mixes author credit with a live product metric ("2 breaks") in one 28px strip. The two belong in different places; "2 breaks" in the author bar reads as a build warning.
- **Redundant `aria-label="Main content"` on `<main>`** (harmless, but noise).
- Icon sizes vary from 12px to 20px with no scale (§A29/A30).

---

## 8. Ranked recommendations

Ordered by impact per unit of effort. **QW** = quick win (< 1h) · **M** = medium (a day) · **S** = structural (multi-day).

| # | Change | Why it matters here | Tag |
|---|---|---|---|
| 1 | **Make the numbers agree.** Reconcile `practice.ts:41-46` `bookAnalytics` against `clients.ts`; fix the four conflicting AUM totals; fix `planning.ts:8` (past-due goal marked `on_track`); fix the two wrong "N months ago" strings at `nbas.ts:121,144` | The product's entire claim is numerical trustworthiness. A reviewer who spots $91.3M / $102.5M / $99.9M / $107.1M for the same figure stops evaluating the design | **QW** |
| 2 | **Fix the Revenue Trend chart** (`revenue.ts:102-103` — drop the zero-revenue future months) and **rescale the AUM waterfall** (four bars render as slivers) | Two visibly broken charts in a *financial* demo, one of them the headline chart on the revenue page | **QW** |
| 3 | **Unfreeze the clock.** Roll the dataset forward or make `MOCK_NOW` (`NBACard.tsx:58`, `tax/shared.tsx:6`, `MessagingContent.tsx:20`, `WorkflowCenterPage.tsx:94`) the single source of "now" that `DashboardPage.tsx:8` also reads | Right now the dashboard says July while every NBA countdown is computed from February, every calendar event is in the past, and every NBA has expired. The flagship feature is silently serving stale advice | **QW** |
| 4 | **Right-align every numeric column and give `CurrencyValue` a default `font-mono tabular-nums`** (`CurrencyValue.tsx:36`, `DataTable.tsx:158`) | The most-visited screens fail the most basic rule of financial tables. `billing.png` proves you can already do it | **QW** |
| 5 | **Define `text-h2`/`text-h3` and `accent-yellow`, or remove them.** Eight wizard headings currently render at browser default; the Archive "Edit Summary" callout renders invisible | Undefined utilities shipping to production is the finding that most damages the craft argument with anyone who opens the source | **QW** |
| 6 | **Kill the 41 blue row buttons on Portfolios**; make row actions ghost-on-hover and wire the existing checkbox column to a bulk-action bar | Restores hierarchy to the app's densest screen and completes an orphaned affordance in the same move | **M** |
| 7 | **Repalette to the warm ink/cream system** — replace the 13 Tailwind-default tokens in `index.css:169-198`, add the missing radius/shadow/z-index/sub-12px type scales, re-author dark mode as its own design, and delete the 20-rule patch layer at `:222-248` | The single change that stops the app looking AI-generated. Everything else is polish on a generic surface | **S** |
| 8 | **Adopt `Button.tsx` and `EmptyState.tsx`** — they are written, tested-shaped, and imported nowhere while 278 hand-rolled buttons carry 8 padding variants | The design system already exists. Using it is cheaper than the 40 polish fixes it would prevent | **M** |
| 9 | **Fix the four failing colour tokens**: `--accent-green` 3.77:1, `--accent-amber` 3.19:1, `--accent-purple` 3.55:1, `--text-tertiary` 2.56:1 (`index.css:177-183`) | Four one-line changes clear the four most pervasive WCAG AA failures, including every AI call-to-action and every positive/negative figure | **QW** |
| 10 | **Surface the AI confidence score and add a confirm/undo on execution.** Confidence is already in `nbas.ts` and weighted in `NBASettingsTab.tsx:326`; `ActionTemplateCard.tsx:177` and `TradeSuggestionCard.tsx:39` currently execute irreversibly on one click | Turns the AI from assertive to calibrated, and removes the one thing a compliance-minded reviewer cannot forgive | **M** |
| 11 | **Cap the AI banner stack at one insight per page** and move the rest into the data (sort + marked band on the Drift column) | Recovers 250–350px above the fold on six screens; makes the AI feel like judgement rather than wallpaper | **M** |
| 12 | **Rebuild `AIInsightCard`**: delete the sparkle (`:41`), 14px semibold title vs 13px body, action link ≥4.5:1, and add *as-of timestamp, dismiss, link to Archive record*. Promote provenance copy from 9–11px to 12px | The difference between "gimmicky" and "trustworthy" for this audience | **M** |
| 13 | **Add the `DialogTitle` to `CommandPalette.tsx:85`**, `aria-describedby={undefined}` to the eight dialogs warning, and make table sorting keyboard-operable (`DataTable.tsx:78`, `:71`, `:129`) | The known warning plus its siblings, and one shared component that fixes a WCAG A failure on every table at once | **QW** |
| 14 | **Fix the responsive contract at both ends** — move the auto-collapse in `AppShell.tsx:34-39` to `!is2XL`; cap the AI panel at `min(400px, 35vw)`; and **add a `max-w-[1180px]` content container**, which the app currently lacks entirely | The app contradicts its own documented breakpoints at 1280 and has no upper bound at all — which is the width a reviewer will actually use | **QW** |
| 15 | **Halve table row height to 44px**, adopt 12px cell padding, and replace card-per-row lists with real tables (`rebalance.png`, `households.png`, `models.png`) | Density *is* the aesthetic in this category. 22 clients on one screen is a demo moment; 11-of-22 with no pagination is a bug | **M** |
| 16 | **Give the rebalance wizard a sticky footer** with "Select all drifted", "Continue" and **Cancel** — and add loading/empty/error handling to `RebalancePage.tsx` (currently it has none of the three) | The app's most consequential irreversible flow is currently a dead end with no exit and no failure state | **M** |
| 17 | **Add `QueryCache.onError`** alongside the existing `MutationCache.onError` (`main.tsx:17-22`), and gate MSW behind `import.meta.env.DEV` (`:25-30`) | Failed queries currently fail silently on 17 of 25 pages, and the mock service worker ships to production | **QW** |
| 18 | **Name the 15 icon-only buttons and the settings switch** (`sr-only` pattern exists at `Dialog.tsx:60-63`); raise the 18 sub-24px targets; route the six hand-rolled modals through the Radix `Dialog` wrapper | Mechanical, high-volume, and what an accessibility reviewer checks first — and the modal fix buys focus trap + restore + scroll lock for six screens from an existing component | **M** |
| 19 | **Consolidate the colour vocabulary to one meaning per hue**, unify the four drifted `SEGMENT_COLORS` arrays and the five KPI-tile designs, switch ordinal scales to single-hue ramps, and give `TreemapChart` a legend | Platinum being blue on one page and purple on the next, and a 10-colour treemap with no key, are the things a reviewer photographs | **M** |
| 20 | **Give the command palette a real resting state** — recent clients, today's meetings, top five commands, the `>` syntax shown rather than described — and **promote the Archive to a first-class concept**, linking every AI artefact to its WORM record (with archive fixtures that actually differ) | The two highest-leverage moments in the app for a "how was this made?" reaction. Both currently spent: one on an empty box, one on a buried route showing empty diffs | **S** |

**Also worth doing, below the top 20:** move the annotation FAB out of the content plane and stop its infinite pulse; add `accessibilityLayer` + `role="img"` to the 15 Recharts roots using `AllocationChart.tsx:67-74` as the template; replace `@email.com` ×22; drop the real-brand and named-security loss claims from `nbas.ts:24`; give the 24 title-less pages a subtitle in the voice of `WelcomeOverlay.tsx:85`; delete the unrouted `NBAEffectivenessPage.tsx`; unify the three step-indicator implementations; guard the `Alt+1..9` shortcuts against text-input targets.

### Suggested commands

- `/normalize` — recommendations 4, 16, 17 (token repalette, colour vocabulary, component consolidation)
- `/polish` — 2, 14, 19 and most of §7 (alignment, badge columns, row heights, icon scale)
- `/quieter` — 1, 3, 5 (the risk chart's saturation, the 41 blue buttons, the banner stack)
- `/distill` — 5, 12, 13 (cut the banners, cut the cards, earn the density)
- `/harden` — 11 and §7 orphaned states (breakpoints, clipping, empty/loading/error coverage)
- `/adapt` — 11, 20 (responsive contract, chart behaviour under the AI panel)
- `/clarify` — the casing/voice pass, "1 NIGO", "NBA Settings", `goal_probability`, "1 exceptions", the greeting mismatch
- `/onboard` — 18 (command palette resting state) and adopting `EmptyState.tsx`
- `/audit` — re-run after 8, 9, 10, 14, 15 to confirm the WCAG numbers moved
