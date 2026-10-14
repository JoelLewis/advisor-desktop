# Phase 7b: showcase polish and the switch

**Date:** 14 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md` (phase 7, split: 7a views, 7b polish and the switch)
**Builds on:** Phase 7a (`2026-10-13-phase-7a-reference-views-design.md`), branch `workspace` @ 3452098

## Goal

Make `workspace` ready to replace the live site: only code that runs, every in-app link resolving, a
README that walks a judge through the demo, CI on every push, the parked items a judge would notice
fixed. Then fast-forward `workspace` into `main` and deploy to production — each of those two steps only
after asking.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Old main-site routes | No redirects ("no one has bookmarks; it's a demo"). Unknown routes keep the existing not-found page |
| CI | GitHub Actions on push and PR: lint, type-check, unit tests, build. Visual baselines stay local (pixel-exact; Linux font rendering differs) |
| README | Judge-first showcase |

## 1. Links that resolve

- Every route string the running app can render (notification targets, search results, AI/agent action
  links, citations, mock data reaching a workspace screen) points to a route `src/app/routes.tsx` defines.
  Reachable stale strings (e.g. `/portfolios/accounts/:id` → `/accounts/:id`, `/portfolios/trading` →
  `/blotter`) are rewritten; unreachable ones go with the dead code (section 2).
- Guard test: collect every in-app path literal reachable from production code and mock data that a
  screen can show, and match each against the router's route patterns; any non-matching path fails.
- The not-found page names the demo's starting points (home, the Brief) and nothing else.

## 2. Dead legacy code

- The old app's services, hooks, MSW handlers, mock data, components, types and tests that nothing reachable
  from `src/main.tsx` (and the MSW worker setup) uses are deleted. The tool is knip (pinned version, run via
  `pnpm dlx`, no new dependency) plus a manual import-graph check; anything the engine or a reachable
  handler still reads stays.
- The old `e2e/` Playwright suite and its config and scripts (`test:e2e*`) go if they exercise removed
  pages; `e2e-visual` stays.
- Tests of deleted code are deleted with it; no reachable behaviour loses coverage (the suite count may
  fall; the report lists what went and why).
- Result: `pnpm dlx knip` reports no unused files and no unused exports in `src` (documented ignores only,
  each with a reason).

## 3. CI

- `.github/workflows/ci.yml`: on push and pull_request; ubuntu-latest; pnpm (version from
  `packageManager`), Node LTS pinned, pnpm store cached; steps `pnpm install --frozen-lockfile`,
  `pnpm lint`, `pnpm type-check`, `pnpm vitest run`, `pnpm build`.
- The repo's pnpm 11 `allowBuilds` setting is respected (CI must not need interactive approvals).
- Suite timeouts sized for a CI runner (the suite is CPU-bound); a flaky test is fixed, not retried.
- A CI badge in the README.

## 4. README (judge-first)

- What it is in two sentences: a multiplayer advisor workspace for a fictional SEC-registered RIA
  (Larkfield Advisory), every figure derived from a mock book or labelled modeled, a frozen demo date.
- A guided five-minute path with the exact clicks: the Brief → Johnson rebalance and harvest (proposal,
  workbench, approval) → compliance release as Mark Davis (presenter shortcut) → the blotter and the moved
  book → the Johnson annual review (prep, hold, notes, file, recap) → Dr. Pell from first contact to
  onboarding → the reference views → View as Robert (he sees only his thread).
- Screenshots taken from the visual baselines (referenced in place, no copies).
- What it enforces: separation of duties, thread visibility and the one external-party boundary,
  append-only acts with fingerprints, wash sales scoped to the taxpayer, disclosure timing as firm policy,
  digit-free agent claims, modeled-vs-derived labelling.
- Architecture: React, TypeScript strict, Vite, Tailwind tokens, TanStack Query, MSW as the "server",
  the session ledger and event clock; the kit; tests (unit, visual baselines).
- Run it: `pnpm install`, `pnpm dev`, `pnpm vitest run`, `VISUAL_PORT=5195 pnpm visual`.
- Plainly: a demo, mock data, no real people, not investment or tax advice.
- US spelling; no real person's name for demo people.

## 5. Parked items

- Every item parked in the Phase 4, 5, 6 and 7a ledgers (archived in the session scratchpad) is triaged
  FIX (a judge would notice it on screen, in copy, or reading the code) or PARK (test-only, cosmetic in
  code). The plan lists each with its verdict; FIX items are done in this phase. Items deleted with dead
  code are closed.

## 6. The switch

- After the final review: full vitest, lint, build, visual green on `workspace`; preview refreshed.
- **Ask**, then fast-forward `main` to `workspace` and push (no merge commit; `main` has nothing
  `workspace` lacks — checked first).
- **Ask**, then `pnpm deploy` (production, advisor.joelelewis.com). `wrangler.jsonc` keeps
  `preview_urls: true`. Verify the live site loads the workspace and the reference views.

## Testing

- The route guard (section 1); knip clean (section 2); CI green on the pushed branch (section 3).
- Unit, lint, build; visual suite green, baselines regenerated only where copy or the not-found page
  changed, every changed PNG looked at.

## Out of scope

- New features or views; real integrations; redirects for old routes.
- Visual tests in CI; preview deploys from CI.

## Success criteria

- A judge can follow the README's path end to end on the live site.
- No dead code, no dead links; CI green.
- `main` is `workspace` and advisor.joelelewis.com serves it.
