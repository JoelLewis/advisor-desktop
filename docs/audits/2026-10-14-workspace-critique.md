# Workspace design critique (impeccable:critique)

**Target:** the `workspace` preview @51089d8, reviewed at 1440×900 in light and dark. Screens walked: the home page, the Brief, Johnson Rebalance Review, the workbench, Supervision, the meeting view, Book risk, and Pell (from its baselines).
**Companion:** the technical audit, `2026-10-14-workspace-audit.md`. It covers accessibility, performance and responsive issues, so they are not repeated here.

---

## Anti-patterns verdict: PASS, clearly

No one would say "AI made this." It has a point of view: a trading-desk instrument panel rather than a SaaS dashboard.

- **Hairlines, not cards.** Structure comes from rules and section labels. There are no drop shadows or rounded containers.
- **Restrained colour.** One signal orange appears only on out-of-band states. Everything else is tinted ink on a cool paper ground.
- **Distinctive marks.** Tick-ruler drift gauges with a hatched tolerance zone, a wash-sale window ruler with "Today" marked, hatched and dashed visibility bands, and record slips for binding acts.
- **A real typeface.** Archivo is used across its width axis: condensed labels and wide readouts.

None of the tells are present: no gradient text, no glass, no glowing dark mode, no card grids, no icon-above-heading, no bounce.

The one template-adjacent move is the "8 / 10 accounts above / below tolerance" pair on Book risk. It is a hero-metric pattern, but it is earned, because the numbers are labelled and give their denominators.

## Overall impression

The parts are excellent and the product is strong. What lets it down is the sequencing of attention.

Every screen is truthful, dense and carefully labelled. But almost every screen gives every fact the same voice, in the same small caps, at the same weight. The eye has nowhere to land first. An advisor at 7 a.m. needs the reverse: the three things that matter today, loud, and everything else quiet and one step away.

**The single biggest opportunity:** make the Brief, and then the home page, say "here is your day". At present they say "here is everything the agents measured on one account".

## What's working

1. **The workbench's tax effect is the best composition in the app.** A plain ledger runs top to bottom: gains, losses, net, year to date, netting. It resolves into one large readout, *Estimated net tax 10,422 USD*, with the method and its limits printed underneath. That single heavy number among quiet rows is exactly the hierarchy the rest of the app lacks. It is also domain-honest: it states the return-level netting, the rates, that state tax is not modeled, and that this is an estimate.
2. **Visibility is drawn as a texture, not a badge.** Hatched means firm only, dashed means only you, solid means shared. A reader learns the security model in seconds and never has to read the label twice. It is the most original idea in the interface, and it carries the multiplayer premise better than any copy could.
3. **The meeting view's transcript-beside-notes is a real workflow.** Each note line cites the transcript turns it came from, and the "To Robert" client wording is indented under the internal line. It shows auditability instead of claiming it, which is what a CCO judge looks for.

## Priority issues

### 1. The Brief is a list of measurements, not a plan for the day

- **What:**
  - The ranked summary is eight underlined sentences of nearly equal weight. Only the first carries a mark (OUT). One sentence runs to five lines and explains wash-sale deferral versus disallowance.
  - Everything happening today sits at the very bottom, after eight full finding cards: the 14:00 Johnson review, Dr. Pell's 15:30 coffee with its Form CRS deadline, and the open reconciliation break.
  - All eight findings concern one account (Robert Johnson Individual), in a book of 47.
- **Why it matters:** this is the first screen of the demo path. A judge reads "US Equity is outside its tolerance band" and "Private Equity cannot be sold at market…" without knowing why either matters today. The calendar items, which carry the story, are below the fold. "Ranked" is claimed but not shown.
- **Fix:**
  - Lead with a three-line **Today** block, in time order: *09:30 orders await compliance · 14:00 Johnson annual review · 15:30 Dr. Pell coffee (Form CRS due before)*. Each line gets one action.
  - Then **Needs a decision**: the two or three findings that would change a trade, each a single short sentence with its number.
  - Fold the explanatory findings (private equity liquidity, held-away visibility, the SMH substitution rule) into a quiet **Context** group, collapsed or set in ink-3.
  - Cap summary lines at one line, and move the explanation into the finding card.
  - Make the rank visible: number the lines, or step them down in weight.
- **Command:** `/distill`, then `/clarify`

### 2. Repetition flattens every card

- **What:**
  - Each of the eight Brief findings repeats the same scaffolding: the agent name, the timestamp, a "MAY …" chip, a "MAY NOT …" chip, "RELIES ON …", "as of 2026-02-25 12:00 UTC", "Take to team thread" and "Take to Johnson annual review".
  - The thread list prints "Firm only · client can't see" above every internal thread, even though the hatch already says it.
  - The meeting notes put "Edit Remove" under every one of 24 lines.
- **Why it matters:** the scaffolding outweighs the content. In a finding card the claim and its number are perhaps 20% of the ink. The permission chips are a strong idea once, on the agent's roster in the context column. Repeated eight times in the main column, they become noise.
- **Fix:**
  - Show agent permissions once, in the context column where they already live, and drop the chips from each post.
  - Show "as of" once per thread when every finding shares it, and only where a source differs.
  - Collapse the two "Take to…" actions into one menu, "Take to ▾", revealed on hover or focus.
  - Show the visibility caption once, as a legend at the top of the thread list, and let the hatch alone mark each thread.
  - Reveal "Edit / Remove" on hover or focus of a note line.
- **Command:** `/quieter`

### 3. Long screens with no shape: the workbench is 2,663 px tall and the meeting view 4,280 px

- **What:**
  - In the workbench, drift is drawn twice: nine gauges before, then nine after, stacked. A reader has to scroll and hold the first set in memory to compare.
  - In the meeting view, the agenda, which comes first in time, sits below the notes and transcript. Below it come five dense tables of household summary.
- **Why it matters:** the comparison the workbench exists for, before against after, is spatially split. The meeting view's order fights the meeting's order: agenda, then discussion, then record.
- **Fix:**
  - Workbench: one drift table with **before → after** on each row. Draw each gauge with a ghost tick at "before" and a solid mark at "after", plus the delta. That is nine rows instead of eighteen, and the change becomes the picture. Keep the tax effect beside the legs, not under them, at 1440.
  - Meeting view: agenda first (it is short), then transcript and notes side by side, then the household summary as a collapsed reference section.
- **Command:** `/distill` (workbench drift), `/arrange`-style rework via `/polish` (meeting order)

### 4. The home page and empty states don't teach

- **What:**
  - `/` is "Workspace · Choose a thread, or start with the Brief" plus a disclaimer, beside a thousand pixels of empty canvas.
  - Supervision for Adrian shows "No orders are waiting", "Nothing sent is waiting for review" and "Choose an item from the queue", with two thirds of the screen empty.
  - The workbench at a stale URL says "Proposal not found".
- **Why it matters:** a judge who arrives from a shared link, not from the README, has no idea there is a story, that the clock moves, or where to click. Empty states are where a demo should narrate itself.
- **Fix:**
  - The home page becomes the README's five-minute path, live: eight numbered steps, each linking into its thread, with the current one marked. It stays in the instrument style, a plain numbered list in the main column with no hero and no cards.
  - Empty states say what fills them and how to get there. For example: *"Orders appear here once an advisor approves a proposal. In the demo: Johnson Rebalance Review → Approve v3."*
  - "Proposal not found" adds: *"Demo state resets when the page reloads. Start again from the Brief."*
- **Command:** `/onboard`

### 5. Two clocks: UTC timestamps beside ET schedules

- **What:** posts, records and "as of" lines read "2026-02-25 12:00 UTC", while the calendar reads "Meeting at 14:00 ET" and "Coffee 15:30 ET". The Brief is stamped 12:00 UTC, which is 07:00 ET. That reads as noon to anyone skimming.
- **Why it matters:** a US advisor lives in Eastern time, so the UTC stamps quietly undermine the story's timeline. "Orders released today were filled" at 14:40 UTC before a 14:00 ET meeting looks out of order unless you convert.
- **Fix:** show every human-facing time in ET with the zone ("07:00 ET"). Keep UTC in the record slip's fingerprint details for books-and-records, and in tooltips.
- **Command:** `/clarify`

## Minor observations

- **Small caps everywhere.**
  - Section labels, column headers, chips, agent roles and status codes all use the same 10.5 px tracked caps. With everything shouting quietly, nothing is distinctive.
  - Reserve caps for section labels and status codes. Set column headers in sentence case at table size, and chips in sentence case.
- **Underlined link prose.** The Brief's summary underlines whole sentences. A wall of underlined text is tiring to read. Underline only the action ("Open finding →"), or make the row the hit target with a hover rule.
- **Header weight.** "Theme: system" is a bordered button as heavy as "View as", the demo's key control. Demote the theme control to a text toggle and let View as be the one bordered control.
- **The key legend in the header** competes with the product name. Move it to the `?` sheet and the footer, and keep only "/ command · ? keys".
- **Abbreviations in a precise UI.** "Intl Equity" and "Emerging Mkts" appear in the thread gauge, while the workbench spells out "International Equity" and "Emerging Markets". Use one form.
- **Two Intel lines in the Brief.** "Was sold at a loss recently" and "The remaining shares can be sold at a loss today" are correct, but they read as a pair only on a second pass. Group them under "Intel Corp." as one item with two readings.
- **The "8 / 10" readouts on Book risk** are the loudest thing on the page, yet the table is the point. Halve their size, or set them inline as "8 above · 10 below of 47".
- **Dark mode's inverted primary buttons** (near-white blocks) are the brightest objects on screen. They are correct by token, but they glare. Consider an outlined primary in dark.

## Questions to consider

- **What would the Brief look like if it had to fit on one screen?** What survives is the real ranking.
- **Does every agent post need its permissions restated?** Or is showing them once, on the roster, the more confident version?
- **Is the context column pulling its weight on the Brief?** It shows who can see, the agent roster and binding acts, all static, beside the most important screen. Could it show today's calendar instead?
- **What if the home page were the README?** A judge would never need the repo to understand the demo.
- **Would one deliberate moment of motion help?** For example, the drift gauges settling from "before" to "after" when a proposal is approved, so the demo has a beat a viewer remembers. One moment only.

## Suggested order

1. `/distill` and `/clarify`: the Brief as a plan for the day (issue 1), and a single clock (issue 5).
2. `/quieter`: strip the repeated scaffolding (issue 2) and the caps-everywhere habit.
3. `/onboard`: the home page as the live five-minute path, and empty states that teach (issue 4).
4. `/distill`: the workbench's before → after drift, and the meeting view reordered (issue 3).
