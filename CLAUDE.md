# AdvisorAI Desktop

AI-native wealth management workstation prototype — React 18 + Vite + TypeScript strict + Tailwind + shadcn/ui.

## Architecture

- **State:** Zustand (UI state) + TanStack Query (server state/cache)
- **Mock data:** MSW (Mock Service Worker) intercepting fetch — all API contracts defined, real backend swappable later
- **Charts:** Recharts (standard charts) + D3 (waterfall, factor exposure)
- **Tables:** TanStack Table with virtual scroll
- **Routing:** React Router v6 with nested layouts
- **Components:** shadcn/ui + Radix primitives

## Conventions

- Feature-based folders: `/src/features/<name>/`
- Shared UI: `/src/components/ui/` (shadcn/ui components)
- Layout: `/src/components/layout/`
- Types: `/src/types/` — domain types, defined before UI implementation
- Services: `/src/services/` — thin fetch wrappers, MSW intercepts all calls
- Mock handlers: `/src/mocks/handlers/` — one file per integration category
- Hooks: `/src/hooks/` — shared React hooks
- Store: `/src/store/` — Zustand stores
- No barrel files, ESM only
- `type` over `interface`, `as const` over enums
- Strict TypeScript — no `any`

## Path Aliases

- `@/` → `src/`

## Design Tokens

12 CSS custom properties defined in `src/index.css`:

| Token | Hex | Usage |
|---|---|---|
| `--surface-primary` | `#FFFFFF` | Card backgrounds |
| `--surface-secondary` | `#F8FAFC` | Page background |
| `--surface-tertiary` | `#F1F5F9` | Hover states, subtle fills |
| `--border-primary` | `#E2E8F0` | Card borders, dividers |
| `--border-secondary` | `#CBD5E1` | Input borders |
| `--text-primary` | `#0F172A` | Headings, primary text |
| `--text-secondary` | `#475569` | Secondary text, labels |
| `--text-tertiary` | `#94A3B8` | Placeholder, disabled |
| `--accent-blue` | `#2563EB` | Primary actions, links |
| `--accent-green` | `#059669` | Positive values, success |
| `--accent-red` | `#DC2626` | Negative values, errors |
| `--accent-purple` | `#7C3AED` | AI-generated content indicator |

Fonts: Inter (UI), JetBrains Mono (tabular data, code)

## Layout Dimensions

- Sidebar: 64px collapsed / 240px expanded
- Top bar: 56px
- Breadcrumb bar: 40px
- AI panel: 400px / 600px (resizable)
- Status bar: 28px

## Mock Data Consistency Rules

All mock data must be internally consistent:
- Position values sum to account value
- Account values sum to household AUM
- Drift = |actual weight - target weight| per asset class
- TWR compounds correctly across periods
- Benchmark comparisons are plausible (within ±5% typical)
- NBA grouping: ≥3 clients with same action = batch opportunity

## Domain Glossary

- **NBA** — Next Best Action (AI-suggested tasks)
- **UMA** — Unified Managed Account (multi-sleeve wrapper)
- **PMS** — Portfolio Management System
- **OMS** — Order Management System
- **ACAT** — Automated Customer Account Transfer
- **NIGO** — Not In Good Order (missing/invalid paperwork)
- **RMD** — Required Minimum Distribution
- **CSA** — Client Service Associate
- **IPS** — Investment Policy Statement
- **TWR/MWR** — Time/Money-Weighted Return
- **WORM** — Write Once Read Many (compliance archival)

## Dev Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript compiler check (no emit)
npm run preview      # Preview production build
```

## Key Implementation Notes

- Purple accent (`#7C3AED`) = AI-generated content throughout the app
- `prefers-reduced-motion` respected for all animations
- Skeleton loading states for every data-fetching component
- Responsive: 1920+ (3-col), 1440-1919 (2-col default), 1024-1439 (collapsed nav), <1024 (not supported)
