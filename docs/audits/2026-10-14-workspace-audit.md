# Workspace audit (impeccable:audit)

**Target:** https://workspace-advisor-desktop.joel-e-lewis.workers.dev, built from `workspace` @51089d8 (the build that would go live).
**Date:** 14 October 2026.
**Method:** Four passes:
- **Accessibility:** axe-core 4.13 over 25 routes in both themes, plus dialogs, the workbench and View-as Robert. Scripted keyboard, focus, live-region, reflow and text-zoom tests.
- **Performance and responsive:** Lighthouse 12, desktop and mobile. Bundle analysis, caching headers, CDP profiling at 4× CPU, and six widths × six routes.
- **Theming:** token and literal scans, dark screenshots of 20 routes, computed contrast, and a first-paint check.
- **Design review:** a manual walk of the live preview.

Every finding below is cited to source and was reproduced. This document only describes the problems; it fixes nothing.

---

## Anti-patterns verdict: **PASS**

This does not look AI-generated. A reviewer would more likely ask "how was this made?" than "which AI made this?"

Checked against the tells:

| Tell | Present? |
|---|---|
| AI palette (cyan on dark, purple-blue gradients, neon accents) | No. One signal orange used only for status; every neutral is tinted (hue 250); no #000 or #fff anywhere |
| Gradient text, glassmorphism, glow borders | None |
| Card grids, nested cards, rounded rectangles with drop shadows | None. Rules, hairlines and dense tables, the "instrument" language |
| Generic fonts (Inter, Roboto, system) | No. Archivo variable, using its width axis for readouts |
| Monospace as "technical" shorthand | No |
| Sparklines as decoration | No. The one line chart is labeled modeled and has a method note |
| Bounce or elastic easing; animating layout properties | No. The only motion is a 520 ms opacity fade on gauges, and reduced motion is honored |
| Every button primary | No. Clear hierarchy of primary, quiet text actions and links |
| Color as the only carrier of meaning | No. Every status has text plus a shape; visibility is a hatch or dash pattern plus words |

The distinctive moves are worth keeping:
- drift gauges with tick rulers;
- dimmed decimal digits in tabular figures;
- hatched "firm only" bands;
- record slips for binding acts.

**Two near-misses:**
- **Book risk headline numbers.** The "8 / 10" readouts on Book risk are the nearest thing to the hero-metric template. They are labeled instrument readouts with denominators, so they pass, but they are the first thing a reader sees on that page.
- **The home screen is nearly empty** (see finding H7). It is the weakest first impression in an otherwise opinionated interface.

---

## Executive summary

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 7 |
| Medium | 11 |
| Low | 12 |
| **Total** | **31** |

**Overall quality:** strong on desktop, weak on phones.
- **Desktop:** Lighthouse scores 0.98 performance and 100 accessibility on the Brief. axe finds zero violations in 50 scans, every text token passes AA in both themes, and token discipline is exceptional.
- **Phones:** the interface reflows, and no feature is cut, but it is the desktop layout poured into one column.
- **Keyboard and screen readers:** the keyboard-first model has a few hard edges for both.

**Most critical:**
1. **C1** Bare single-key shortcuts (`t`, `[`, `\`, `]`, `/`, `?`) cannot be turned off. This fails WCAG 2.1.4 (A).
2. **H1** The `/` command line opens 1,286 px tall, with its own input off-screen at 1440×900.
3. **H2** Focus falls to `<body>` after every Ask-agent request and every Post. These are the demo's core interactions.
4. **H5 + H6** On a phone the layout jumps by about 1.9k px on load (CLS 0.89), and the thread list pushes the content 2,160 px down.
5. **H4** A dark-theme user sees a full light flash on every reload.

**Recommended next steps:**
- **Before the switch:** fix C1, H1, H2, H3 and H4. All are small, contained changes.
- **Then:** take the phone layout (H5, H6) as one piece of work.

---

## Detailed findings

### Critical

**C1. Single-character shortcuts cannot be turned off or remapped**
- **Location:** all routes.
  - `src/kit/keyboard/KeyboardProvider.tsx:54-66` (`/`, `?` and registered bindings)
  - `src/workspace/shell/ThemeToggle.tsx:15` (`t`)
  - `src/workspace/shell/WorkspaceShell.tsx:25-29` (`[`, `\`, `]`)
- **Category:** Accessibility. **WCAG:** 2.1.4 Character Key Shortcuts (A).
- **Description:** These keys fire whenever focus is not in a text field, including on buttons, links and table rows. Ignoring text fields does not meet 2.1.4's exception. Reproduced: pressing `t` with focus on "Ask Drift Monitor" switched the theme.
- **Impact:**
  - Speech-input users (Dragon, Voice Control) set them off by dictating words: the theme flips, focus jumps regions, and modals open.
  - The theme change is silent.
- **Recommendation:**
  - Add a "Keyboard shortcuts: on / off" setting in the `?` sheet, persisted.
  - Or add modifier variants (Alt+T, Ctrl+/) with the bare keys off by default for non-keyboard users.
  - Announce theme changes in a polite live region.
- **Command:** `/harden`

### High

**H1. Dialogs have no max-height. The command line opens off-screen, and binding-act dialogs are unreachable at 400% zoom**
- **Location:**
  - `src/kit/dialog/Dialog.tsx:19-20` (centered with `-translate-y-1/2`, no `max-h`, no `overflow-y-auto`)
  - `src/kit/keyboard/CommandLine.tsx:54-61` (the listbox renders every destination, and the active option is never scrolled into view)
- **Category:** Accessibility and Responsive. **WCAG:** 2.4.7 Focus Visible (AA), 1.4.10 Reflow (AA).
- **Description:**
  - At 1440×900 the command line is 1,286 px tall, with its top at y = −193. The title, the combobox and Close are all off-screen, and focus lands on the hidden input.
  - At 320×256, the Resolve brk-002 dialog's title and Resolution select cannot be reached.
- **Impact:** a sighted user presses `/` and cannot see what they type. This is visible to any judge who tries the advertised shortcut.
- **Recommendation:**
  - On the dialog content, add `max-h-[calc(100dvh-2rem)] overflow-y-auto`, or top-anchor it.
  - Cap the listbox height and `scrollIntoView({ block: 'nearest' })` the active option.
- **Command:** `/adapt`

**H2. Focus drops to `<body>` when an action button disables itself**
- **Location:**
  - `src/workspace/context/AskAgents.tsx:40`
  - `src/workspace/context/ProposalAgentControl.tsx:25`
  - `src/workspace/thread/Composer.tsx:55,60`
  - `src/workspace/context/LetterControl.tsx:50`
  - Release-as-Mark falls back to the page h1 (`Dialog.tsx:32-34`).
- **Category:** Accessibility. **WCAG:** 2.4.3 Focus Order (A).
- **Description:** "Ask Drift Monitor", "Ask Proposal Agent" and Post all set `disabled` while the request is pending. Focus moves to `<body>` within 50 ms and stays there.
- **Impact:** after every agent request, keyboard and screen-reader users must tab back through about 20 shell stops. That is the demo's central loop.
- **Recommendation:**
  - Use `aria-disabled` and ignore clicks while pending, instead of `disabled`.
  - Or move focus deliberately to the new message or status line on success.
  - Return focus to the composer after a post.
- **Command:** `/harden`

**H3. One document title for every route**
- **Location:** `index.html:7`. Nothing sets `document.title`.
- **Category:** Accessibility. **WCAG:** 2.4.2 Page Titled (A).
- **Description:** Billing, the Pell thread and "Page not found" all share one title.
- **Impact:** tabs, history and screen-reader window lists cannot tell views apart.
- **Recommendation:** add a `usePageTitle(h1)` hook beside each page h1, producing `${h1} · Advisor Desktop`.
- **Command:** `/polish`

**H4. Flash of the wrong theme on every load**
- **Location:** `index.html` has no inline theme script and no `<meta name="color-scheme">`. `src/main.tsx:13` sets `data-theme` only after the bundle runs.
- **Category:** Theming.
- **Description:** with dark stored and a light OS, first paint is light at 328 ms and dark arrives at about 940 ms. The `?theme=` parameter has the same problem.
- **Impact:** a full-screen light flash for dark-theme users on every reload, the worst direction.
- **Recommendation:**
  - Add an inline `<head>` script that mirrors `theme.ts`, reading the stored choice and `?theme`, and sets `data-theme` before paint.
  - Add `<meta name="color-scheme" content="light dark">`.
  - Test that the script and `theme.ts` agree.
- **Command:** `/harden`

**H5. Mobile layout shift of 0.89**
- **Location:**
  - `src/workspace/shell/WorkspaceShell.tsx:35-52`
  - `src/kit/keyboard/KeyLegend.tsx`, which gains items after mount
  - `ThreadList.tsx`, whose "Loading threads…" grows from 21 px to 1,897 px
- **Category:** Performance.
- **Description:** Lighthouse mobile CLS is 0.897 and stable across four runs. That is a single shift of about 0.887 at 123 ms. Mobile performance scores 0.57 (FCP 3.0 s, LCP 4.1 s). Desktop CLS is 0.01.
- **Impact:** content a phone user starts reading jumps away, and the score a curious judge would run looks poor.
- **Recommendation:**
  - Reserve the thread list's height with a skeleton.
  - Render the full key legend at first paint, or hide it on touch devices (M6).
- **Command:** `/optimize`

**H6. On a phone, the thread list comes before the work**
- **Location:** `src/workspace/shell/WorkspaceShell.tsx:46-60`. The `<nav>` comes first in the DOM, with no reordering.
- **Category:** Responsive.
- **Description:** at 390 px, `<main>` starts at y = 2,160 on `/` and every `/t/*` route. On the Brief, the context column sits at y = 8,438 of a 9,035 px page. The full-width reference routes are fine; they start at about y = 210.
- **Impact:** a judge who opens the link on a phone sees chrome and a list of links, not a workspace.
- **Recommendation:**
  - On narrow viewports, show threads as a drawer, a disclosure, or a Threads | Thread | Context tab bar.
  - Put `main` first.
  - Add a sticky "Threads" control.
- **Command:** `/adapt`

**H7. The home screen wastes the first impression**
- **Location:** `src/workspace/shell/WorkspaceHome.tsx`.
- **Category:** Design (onboarding).
- **Description:** `/` shows "Workspace · Choose a thread, or start with the Brief" and a disclaimer line, then about 1,000 px of empty canvas beside the thread list. The README's five-minute path lives only in the repo.
- **Impact:** a judge arriving from a shared link gets no sense of what the product does or where to click. Every other screen shows the instrument language well; the landing page shows none of it.
- **Recommendation:**
  - Make home the start of the story: two sentences on what this is, and "Start the five-minute path → the Brief".
  - Add a compact list of the eight steps, linking into the live threads.
  - Optionally add a live reading, for example today's ranked summary headline.
  - Keep it in the instrument style: no hero, no cards.
- **Command:** `/onboard`

### Medium

**M1. Agent posts, fills and posted messages are not announced** (WCAG 4.1.3, AA)
- **Location:**
  - `ThreadPage.tsx:42`: the message list has no live semantics.
  - `ApprovalPanel.tsx:176`: a release and its fills produce no announcement.
  - The status lines at `AskAgents.tsx:45` and `ProposalAgentControl.tsx:27` mount together with their text, so screen readers often miss them.
- **Fix:**
  - Keep one persistent empty `role="status"` region per panel and write into it, e.g. "Released by Mark Davis; nine orders filled".
  - Consider `role="log"` on the message list for messages from others and from agents.
- `/harden`

**M2. The workbench grid hides its state and keys from assistive tech** (WCAG 4.1.2, A)
- **Location:** `DataTable.tsx:85-97, 140-149`; `WorkbenchLegs.tsx:25-26`.
- **Problem:**
  - Rows are `<tr tabIndex>` with no grid role, so screen readers in browse mode swallow `x`, `j` and `k`.
  - Excluding a leg announces only "Updating the preview…".
  - Enter opens a detail with no `aria-expanded`.
- **Fix:** add grid roles, `aria-expanded` and `aria-keyshortcuts`, and announce "INTC excluded · eight of nine legs". Or add a per-row Exclude toggle.
- `/harden`

**M3. Large readouts overflow narrow screens** (WCAG 1.4.10, AA)
- **Location:** `src/kit/reading/Reading.tsx:10,28` (56 px, 125% width, `inline-flex` with no wrap), used on Billing, Practice and the Model page.
- **Problem:** "91,320,824 USD" is 378 px wide in a 342 px column. The page scrolls sideways, and the unit is clipped to "US".
- **Fix:** clamp the readout size, use `flex-wrap` and `min-w-0`, or step down to the small readout below the narrow breakpoint.
- `/adapt`

**M4. The workbench scrolls sideways on phones**
- **Location:** `src/kit/data-table/DataTable.tsx:101`. The scroll wrapper is not `relative`, so the `sr-only` "Not applicable" spans (`NotApplicable.tsx:2`) escape it.
- **Problem:** `scrollWidth` is 607 against 390 on `/proposals/…`.
- **Fix:** a one-class change, adding `relative` to the wrapper.
- `/adapt`

**M5. Source chips clip the wash-sale dates at 320 px** (WCAG 1.4.10)
- **Location:** `src/kit/source-chips/SourceChips.tsx:10,29-30` (`whitespace-nowrap` inside an `overflow-hidden` box).
- **Problem:** "…open through 2026-03-22" is cut off, and those dates are the window the finding depends on.
- **Fix:** let a part wrap when it is wider than its line.
- `/adapt`

**M6. The key legend and header fill a quarter of a phone screen**
- **Location:** `WorkspaceShell.tsx:35-43`, `KeyLegend.tsx`.
- **Problem:** the header is 191 of 844 px. It shows keyboard keys to touch users, and it causes part of H5.
- **Fix:** hide the legend under `(hover: none)`, and put View as and Theme on one row.
- `/adapt`

**M7. Touch targets are under 44 px almost everywhere** (WCAG 2.5.8, 24 px floor, AA in 2.2)
- **Measured on `/risk`:** 103 of 103 controls are under 44 px, and 91 are under 24 px. Sort buttons are 13 px tall and "Take to team thread" is 16 px.
- **Fix:** under `(pointer: coarse)`, raise the minimum heights and add padding to links, sort buttons, selects and rows. Desktop density is fine.
- `/adapt`

**M8. The type scale is fixed px and ignores the user's font-size preference**
- **Location:** `src/styles/app.css:77-100,125`. Labels are 10.5 px; the body is 14 px.
- **Problem:** with `html { font-size: 200% }`, no text grows, while the rem spacing doubles and four routes overflow at 390 px. Select text is 14 px, below the 16 px at which iOS Safari zooms on focus.
- **Fix:** express the scale in rem, and use `max(16px, 1rem)` for form controls on narrow screens.
- `/normalize`

**M9. The cold load is a serial chain with no preload and no skeleton**
- **Location:** `src/main.tsx:30-52`, `index.html`.
- **Problem:** the chain is `index.js`, then the MSW chunk (discovered only after the first script runs), then the worker, then React, then the font. Under a slow 4G profile, FCP is 2.7 s. A warm load takes 112 ms.
- **Fix:**
  - `modulepreload` the MSW chunk and preload the Archivo latin woff2.
  - Start the worker in parallel with the app chunk.
  - Put a static shell in `index.html`.
- `/optimize`

**M10. Changing "View as" can redirect mid-selection with no explanation** (WCAG 3.2.2, A)
- **Location:** `use-go-home-when-hidden.ts:14-17`, `ViewAs.tsx:12`.
- **Problem:** Robert sits between Mark and Dr. Pell in the list. On a firm-only page, arrowing past him in a native select (Windows fires `change` on every arrow press) sends the user home with focus on "Workspace" and no reason given.
- **Fix:** announce "Robert Johnson can't see Billing; showing the workspace", or use an explicit apply step or a menu button.
- `/clarify`

**M11. Command-line options ignore the pointer**
- **Location:** `src/kit/keyboard/CommandLine.tsx:55-60`. The `role="option"` items have no click handler.
- **Problem:** clicking "Billing" does nothing, and VoiceOver and TalkBack users, who activate by tap, cannot choose a destination. Raised from Low because mouse users hit it too.
- **Fix:** add `onClick={() => go(d)}`, and sync the active index on mouse move.
- `/harden`

### Low

| # | Issue | Location | Fix | Command |
|---|---|---|---|---|
| L1 | The Blotter's Account filter overflows by 7 px at 320 px | `Select.tsx:21-26`, `BlotterPage.tsx:55` | `min-w-0 max-w-full`; stack below narrow | `/adapt` |
| L2 | Selects clip their text at 200% text zoom (fixed `h-9`) | `Select.tsx:26` | `min-h-9` plus padding | `/polish` |
| L3 | Every read-only table adds an unlabeled Tab stop on its first row (four in a row on the meeting view) | `DataTable.tsx:143` | Make rows focusable only when the table has row actions | `/harden` |
| L4 | On reference pages the skip link jumps past the h1 | `src/kit/page/Page.tsx:12-19` | Move the title block inside `<main>` | `/polish` |
| L5 | Tables have no scroll cue and no sticky first column on narrow screens ("AGAINST TOLERANCE · BY H…") | `DataTable.tsx:101` | Edge fade, a labeled focusable region, a sticky first column | `/adapt` |
| L6 | At 1024 px (iPad landscape) the context column drops below main | `app.css:75` (`split: 1100px`) | A split breakpoint near 960 px, or a context drawer | `/adapt` |
| L7 | Every route is bundled eagerly (entry chunk 700 kB, 209 kB gzip). Lazy-loading /kit, supervision and the reference views saves about 31 kB gzip (measured) | `src/app/routes.tsx` | Route-level `lazy` | `/optimize` |
| L8 | DataTable rows are not memoized. No visible cost at 47 rows (sort input delay 40–48 ms at 4× CPU) | `DataTable.tsx:123-150` | A memoized row component | `/optimize` |
| L9 | The "Theme: system" label never says what it resolved to, and the choice is not synced across tabs | `ThemeToggle.tsx:7` | "system (dark)"; listen for `storage` events | `/clarify` |
| L10 | The favicon's hex colors are not theme-aware, and `public/` is outside the color guardrail | `public/favicon.svg:2-4` | A dark media query inside the SVG; allowlist it in the guardrail | `/polish` |
| L11 | The dark token block is duplicated (drift is test-guarded), and the light `--ws-scrim` duplicates `--ws-ink` | `app.css:14, 21-49` | Alias the scrim; keep the drift test | `/normalize` |
| L12 | A shared deep link to session state (a workbench URL) shows "not found" on a fresh load, by design, since state lives in memory | `/proposals/:id` | Say in the empty state that demo state resets on reload, with a link to start the path | `/clarify` |

---

## Patterns and systemic issues

- **Phones get the desktop layout in one column.** H5, H6, M3, M4, M6 and M7 share one cause: the shell has no narrow-screen model. A single drawer or tab design for threads and context would close most of them together.
- **Pending states disable the control that holds focus.** The pattern appears in four components (H2). One kit-level "pending button" built on `aria-disabled` fixes all of them.
- **Status is written as conditionally mounted text.** No persistent live regions exist, so announcements are unreliable everywhere (M1, M2). One app-level announcer would serve every panel.
- **Fixed px sizing.** The type scale, the select heights and the readouts are all fixed px (M8, L2, M3). That is right for density on desktop, but it ignores user preferences.
- **The kit's dialog and command line were never tested at small heights** (H1). A visual baseline at 1440×600 and at 320 px would have caught them.

## Positive findings

- **Token discipline is exceptional.**
  - Colors come from one token block, and `--color-*: initial` makes the Tailwind palette unavailable.
  - Guardrail tests reject color literals and check every contrast pair.
  - The dark theme is a designed palette, not an inversion.
- **Contrast passes everywhere.** Every text token passes AA on every surface in both themes; the lowest is 5.07:1. The hatching never sits behind text.
- **Accessibility basics are clean.**
  - axe finds zero violations across 50 route and theme scans, every dialog, the workbench and the client view.
  - There is one h1 per view, no skipped heading levels, named landmarks, captioned tables with `scope` and `aria-sort`, and a visible skip link.
  - Focus moves to the new h1 on route change, and to the record slip after an approval.
  - Radix dialogs trap focus, close on Esc and restore focus; binding acts open on Cancel.
  - The 2 px focus ring is consistent and visible in both themes.
- **Desktop performance is excellent.**
  - Lighthouse 0.98, TBT 0 ms, CLS 0.01, and about 410 KiB total transfer.
  - Hashed assets are immutable-cached, and HTML and the service worker revalidate.
  - One variable font family, with unicode-range splitting.
- **Runtime is clean.** There are no timers or polling. The only animation is compositor-only and honors reduced motion. Fixed row heights prevent layout shift.
- **Meaning never rides on color alone.** Text, shape and pattern always accompany it.
- **Phones adapt rather than amputate.** Nothing is hidden or broken, and only M3, M4 and L1 scroll sideways.

## Recommendations by priority

1. **Immediate (before the switch, about half a day):**
   - C1: a shortcut on/off setting plus modifier variants.
   - H1: dialog max-height and scroll, plus command-line list scrolling.
   - H2: an `aria-disabled` pending button.
   - H3: per-route titles.
   - H4: an inline theme script.
   - M4: a one-class fix.
   - M11: command-line click handling.
2. **Short-term:**
   - H7: a home screen that starts the story.
   - M1 and M2: an app announcer and workbench grid semantics.
   - M3 and M5: readout and chip wrapping.
   - M10: explain the View-as redirect.
3. **Medium-term, as one piece of work:**
   - The phone shell: H5, H6, M6 and M7, with M8 alongside.
   - M9: preload and a static shell.
4. **Long-term:** the Low table, especially L6 (iPad landscape) and L7 (lazy routes).

## Suggested commands

- `/harden`: C1, H2, H4, M1, M2, M11, L3. 7 issues: keyboard, focus, announcements and first paint.
- `/adapt`: H1, H6, M3, M4, M5, M6, M7, L1, L5, L6. 10 issues: dialogs at small heights and the phone shell.
- `/optimize`: H5, M9, L7, L8. 4 issues: layout shift, the load chain and bundle splitting.
- `/onboard`: H7. The home screen as the start of the five-minute path.
- `/polish`: H3, L2, L4, L10. Titles, select sizing, skip-link target and the favicon.
- `/clarify`: M10, L9, L12. Redirect, theme-label and reset-on-reload copy.
- `/normalize`: M8, L11. The rem type scale and token tidying.
