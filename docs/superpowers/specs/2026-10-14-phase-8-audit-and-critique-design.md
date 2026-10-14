# Phase 8: the audit and the critique

**Date:** 14 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Inputs:**
- `docs/audits/2026-10-14-workspace-audit.md` (31 findings: C1, H1–H7, M1–M11, L1–L12)
- `docs/audits/2026-10-14-workspace-critique.md` (5 priority issues plus minors)

**Builds on:** Phase 7b, branch `workspace` @4607e32. `main` is untouched until the user approves the branch.

## Goal

Make the workspace read as a plan for the advisor's day, quiet where it can be and loud where it matters. Make it usable from a keyboard, a screen reader and a phone. Every audit finding and every critique priority issue is closed or explicitly parked with a reason.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Phasing | One phase. The plan orders the desk work first and the phone shell last |
| Brief | Today · Needs a decision · Context |
| Single-key shortcuts | An on/off setting, on by default, saved per browser |
| Clock | Eastern Time everywhere people read a time; UTC only in record details and fingerprints |

## 1. The Brief as a plan for the day (critique 1)

The Brief has three groups, top to bottom.

**Today.** Lines in time order, derived by the engine from session state. Each line has one action.

| Line | Shown when | Action |
|---|---|---|
| "Orders await compliance review" (account, version) | while staged orders await release | link to the team thread |
| "14:00–15:15 ET Johnson annual review" | always, with its state (scheduled / held / filed) | "Open the meeting thread" |
| "15:30 ET Coffee with Dr. Amanda Pell · Form CRS due before" | until the coffee is recorded; it reads "Form CRS delivered" once delivered | "Open her thread" |
| "Reconciliation · N open breaks" | while any break is open | "Open reconciliation" |

**Needs a decision.**
- It holds only the findings that would change a trade: an out-of-band sleeve, and a harvestable loss allowed now.
- Each finding is one line with its key figure (formatted by the kit, never typed into the claim) and a visible rank (numbered).
- A claim stays digit-free.
- The engine classifies each finding kind as `decide` or `context`, so the rule lives in one place and is tested.

**Context.**
- It holds the explanatory findings: private equity liquidity, the SMH substitute rule, held-away visibility, and a recently realized loss.
- The group is collapsed by default and set in quiet ink.
- The two Intel findings appear as one item, "Intel Corp.", with two readings: realized recently, and the remaining shares allowed now.

**Rules that carry over:**
- The full finding cards stay below the three groups, unchanged in substance.
- The Brief re-measures after fills, as it does today: Today drops the release line, and Decide drops a harvest once it is sold.
- The old bottom-of-thread lines (reconciliation, meeting, next action) are replaced by Today, not duplicated.

## 2. Quieter scaffolding (critique 2, minors)

- **Agent posts.**
  - The MAY / MAY NOT chips come off each post. They stay on the context column's agent roster.
  - "As of" appears once when every source of a post shares it; it appears on a source chip only where that source differs.
  - "Take to team thread" and "Take to <meeting>" become one "Take to ▾" menu: a button opening a list of destination threads, keyboard-operable.
- **Thread list.**
  - One visibility legend sits at the top of the list.
  - Each thread row shows only its hatch, dash or solid mark, with an accessible "Visibility: …" note.
- **Meeting notes.** "Edit" and "Remove" appear on hover or focus within a note line, and they are always reachable by keyboard.
- **Type.**
  - Small caps are reserved for section labels and status codes.
  - Table column headers and chips use sentence case.
- **Header.**
  - The theme control becomes a quiet text toggle.
  - The key legend shrinks to "/ command · ? keys". The full list lives in the `?` sheet.
  - View as stays the one bordered control.
- **Copy.**
  - Asset-class names are spelled out everywhere: "International Equity", "Emerging Markets".
  - Book risk's above/below readouts drop to the small readout size.

## 3. One clock (critique 5)

- Every human-facing timestamp uses `fmtEasternStamp`, which returns "25 Feb 07:00 ET": message stamps, "as of" lines, record slips, the archive, supervision and the blotter.
- Same-day contexts may drop the date.
- The format is deterministic in any time zone and DST-correct. It reuses Phase 7b's fixed-table approach.
- UTC stays only inside the record slip's details and fingerprints, labeled "UTC".

## 4. Home and empty states (audit H7, M10, L12; critique 4)

**Home (`/`).**
- One sentence says what this is.
- The fictional-firm notice stays.
- Then the README's eight steps, numbered. Each step links into its thread or view.
- Each step is marked done from session state, using these rules (engine-derived and tested):
  - an approval act exists;
  - the release is recorded;
  - the meeting is filed;
  - the recap is sent;
  - the Pell proposal is sent;
  - she has accepted;
  - a break is resolved.
- The next undone step is marked "Next".
- There is no hero and there are no cards: it is a plain numbered list in the instrument style.

**Empty states.** Each one names what fills it and the step that does so.
- Supervision queue groups: "Orders appear here once an advisor approves a proposal (Johnson Rebalance Review → Approve)".
- Correspondence: "Sent client messages appear here for review".
- Archive.
- "Choose an item" panes.

**Not found for session state.** For example, a proposal on a fresh load reads "This demo's state resets when the page reloads", with a link to the Brief.

**View-as redirect.** The home page says why the user landed there: "Robert Johnson can't see Billing; showing the workspace". This uses the app announcer and a visible line.

## 5. Shape on the long screens (critique 3)

- **Workbench drift.**
  - One table replaces the before and after stacks.
  - Each row shows the class, a gauge with a ghost tick at before and a solid mark at after, then before, after and Δ, plus its status.
  - That is nine rows instead of eighteen.
  - Residual reasons ("held to the model's cash target", "no market to sell into") stay on their rows.
- **Meeting view order.**
  1. Header and agenda.
  2. Transcript beside notes.
  3. The household summary, as a collapsed "Household reference" section.

## 6. Keyboard and accessibility (audit C1, H1–H3, M1, M2, M11, L2–L4)

- **Single-key shortcuts setting (C1).**
  - A "Single-key shortcuts" switch sits in the `?` sheet, on by default, stored in `localStorage`.
  - When off, `t`, `[`, `\`, `]`, `/` and `?` do nothing.
  - A modifier route stays available in both states, so the sheet and the command line stay reachable: Ctrl/⌘+K opens the command line and Shift+? opens the sheet.
  - A theme change made by key is announced.
- **Dialogs (H1).**
  - The kit dialog has a max height of the viewport minus 2rem, and its content scrolls.
  - The command line's list has its own scroll, keeps the active option in view, and accepts clicks and taps.
- **Pending actions (H2).**
  - One kit pending pattern: the button stays focusable with `aria-disabled` and ignores activation while pending.
  - The composer returns focus to its textarea after a post.
  - Release-as-Mark returns focus to the record slip.
- **Titles (H3).**
  - Each route sets `document.title` to "<h1> · Advisor Desktop".
  - The not-found page is "Page not found · Advisor Desktop".
- **Announcer (M1).**
  - One persistent, initially empty `role="status"` region at app level, written through a hook.
  - It announces:
    - agent posts ("Drift Monitor reported in the thread");
    - fills ("Released by Mark Davis; nine orders filled");
    - saves, sends and recorded acts;
    - theme changes and View-as redirects.
- **Workbench grid (M2).**
  - The legs table uses grid roles, with `aria-expanded` on rows that open a detail and `aria-keyshortcuts`.
  - Excluding or including a leg is announced, for example "INTC excluded · eight of nine legs".
- **Focusable rows (L3).** A table row takes focus only when its table has row actions.
- **Skip link (L4).** The skip link lands on the page's h1, inside `<main>`.
- **Selects (L2).** Selects use a minimum height plus padding, so text zoom does not clip them.

## 7. Theme, reflow, phone shell and load (audit H4–H6, M3–M9, L1, L5–L11)

**Theme.**
- **No flash on load (H4).**
  - An inline `<head>` script reads the stored theme and `?theme` and sets `data-theme` before first paint.
  - `<meta name="color-scheme" content="light dark">` is added.
  - A test keeps the inline script and `theme.ts` in agreement.
- **Theme label (L9).**
  - The label reads "System (dark)" or "System (light)".
  - A `storage` listener syncs the choice across tabs.
- **Favicon and tokens (L10, L11).**
  - The favicon gains a dark-scheme style.
  - `public/` joins the colour-literal guardrail, with the favicon allowlisted.
  - The light scrim aliases ink.

**Reflow.**
- **Readouts (M3).** Readouts clamp their size and wrap the unit under narrow widths.
- **Table scroll wrapper (M4).** The table scroll wrapper is `relative`, so screen-reader-only spans cannot widen the page.
- **Source chips (M5).** A source-chip part wraps when it is wider than its line.
- **Filter row (L1).** The blotter filter row fits at 320 px.
- **Table scrolling on narrow screens (L5).** Tables get a scroll edge cue, a labeled focusable scroll region, and a sticky first column on narrow screens.

**Phone shell (H6, M6, M7).**
- Below 768 px the shell shows a tab bar: Threads | Thread | Context.
- The tab bar is sticky, keyboard-operable, and uses `aria-current`.
- The thread is shown first on `/t/*` routes. The home page shows Threads.
- The key legend is hidden under `(hover: none)`.
- Under `(pointer: coarse)`, interactive targets are at least 44 px, and never under 24 px anywhere.

**Type scale (M8).**
- The type scale moves to rem, with the same px values at the default root size.
- Form controls are at least 16 px on narrow screens.

**Split breakpoint (L6).** The three-pane split starts at 960 px, so iPad landscape keeps three panes.

**Load.**
- **Layout shift (H5).**
  - The thread list reserves its height with a skeleton.
  - The key legend renders its full set at first paint.
  - Target: mobile CLS ≤ 0.1.
- **Load waterfall (M9).**
  - Preload the mock-server chunk (modulepreload) and the Archivo latin woff2.
  - Start the worker in parallel with the app chunk.
  - Ship a static shell in `index.html` that matches the first frame.
- **Lazy routes (L7).** Route-level `lazy` for `/kit`, supervision, archive, prospect and the reference views. The MSW chunk stays eager.
- **Row rendering (L8).** DataTable rows are memoized.

## Parked (with reasons)

- **L12 deep links to session state.** These are covered by the "resets on reload" empty state. Persisting the engine is out of scope.
- **Duplicated dark token block (L11, first half).** CSS cannot share one rule between a media query and an attribute selector. The drift test stays.
- **`/kit` showing the advisor's data whoever the viewer is.** `/kit` is a component gallery and is not a viewer surface.

## Testing

**Unit tests.**
- Brief grouping:
  - each finding kind → `decide` or `context`;
  - Today lines derived from session state, and their changes after the release, filing and Form CRS;
  - the Intel grouping.
- `fmtEasternStamp`: zones, DST, and the same-day form.
- The shortcuts setting, on and off, with the modifier routes.
- The announcer's messages.
- Home step completion and "Next".
- Pending-button focus.
- Titles per route.
- The phone tab bar.
- The theme inline script agreeing with `theme.ts`.

**Accessibility.** `@axe-core/playwright` is added as the phase's one dev dependency. It runs in the visual suite on every scene, and any violation fails the run.

**Visual baselines.**
- New:
  - the Brief (light and dark);
  - home, fresh and mid-story;
  - workbench drift;
  - the meeting view;
  - the `?` sheet with the setting;
  - phone scenes at 390 px (home, the Brief, a thread, the context tab, book risk);
  - the dialogs at 1440×600 and at 320 px.
- Every changed PNG is opened and looked at. The readme-path spec is updated to the new Brief, and the README's click path is updated with it.

**Performance check.** A scripted Lighthouse-equivalent measure: mobile CLS ≤ 0.1 on `/` and `/t/th-brief`. It is recorded in the report, not gated in CI.

## Out of scope

- New features or views, and real integrations.
- Persisting demo state across reloads.
- Anything touching `main`. The switch happens only after the user approves the branch.

## Success criteria

- Every audit finding and critique priority issue is closed, or parked above with a reason.
- A judge's first screen at `/` and at the Brief says what the day holds and where to start.
- axe is clean in the visual suite. Keyboard users never lose focus after an action. Shortcuts can be turned off.
- On a phone, the thread comes first, the layout does not jump, and targets are tappable.
