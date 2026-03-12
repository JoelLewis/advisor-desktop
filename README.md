# Advisor Desktop

AI-native wealth management workstation for financial advisors. Built as a fully functional prototype with 20+ pages, 130+ mock API endpoints, and deep AI integration throughout every workflow.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Overview

Advisor Desktop reimagines the financial advisor workstation with AI as a first-class participant in every workflow. Rather than bolting a chatbot onto a traditional dashboard, AI is woven into portfolio management, client engagement, compliance, and practice operations — suggesting next-best actions, drafting communications, pre-checking trades for compliance, and autonomously executing standing rules.

The entire app runs client-side with [MSW](https://mswjs.io/) intercepting all API calls, making it a self-contained, zero-backend demo that's ready to connect to real services.

## Features

### Dashboard & Navigation
- Practice-wide metrics bar with click-through navigation
- Command palette (`Ctrl+K`) with fuzzy search across clients, accounts, households, pages, and actions
- Collapsible sidebar with keyboard shortcuts (`Alt+1`–`Alt+6`)
- Notification center with category tabs and unread badges
- Quick capture (`Ctrl+N`) for tasks and notes from any screen
- Dark mode with system preference detection
- Responsive layout: 1024px to 1920px+

### Client Management
- Client list with search, filtering, and segmentation
- Client detail with tabbed views: overview, documents, activity, notes
- Household aggregation with family tree visualization
- 5-step client onboarding wizard (info, risk profile, account setup, documents, review)
- Client report generation with AI-written section content

### Portfolio Management
- Portfolio overview with accounts, households, and model views
- Account detail with positions, performance (TWR), risk metrics, and order history
- Real-time drift monitoring with rebalance triggers
- Multi-step rebalance wizard (select accounts, preview trades, compliance check, execute)
- Brinson performance attribution (allocation, selection, interaction) with D3 waterfall charts
- Risk analytics: Monte Carlo simulation, sensitivity analysis, stress scenarios
- Concentration analysis with D3 treemap and HHI calculation
- Tax lot management with harvest scanner, wash sale calendar, and cost basis method comparison

### Trading
- Multi-asset trade ticket supporting 5 asset classes:
  - **Equities** — Buy/Sell/Short/Cover, Market/Limit/Stop/Stop-Limit, time-in-force, extended hours
  - **Options** — Chain browser with Greeks display (IV, delta, theta, gamma, vega)
  - **Mutual Funds** — Purchase/Redemption/Exchange with NAV info
  - **Fixed Income** — Par value entry, Price/YTM/YTW toggle, bond detail cards
  - **Digital Assets** — Fractional quantities, units/dollar toggle, 24h market data
- Pre-trade compliance checks (concentration, restricted list, wash sale, cash reserve, sector limits)
- Smart trade prefill from AI suggestions

### AI Integration
- Contextual AI chat panel with screen-aware briefing cards
- Suggested prompts that adapt to current page context
- Action cards with approve/reject/execute workflows
- 8 parameterized action templates (rebalance, TLH, draft email, schedule meeting, etc.)
- Trade suggestions rendered inline with one-click execution
- Unified communications tab showing all client interactions
- AI-generated content marked with purple accent (`#7C3AED`) throughout

### AI Autonomy & Automation
- Standing rules with time-based and event-based triggers
- Permission matrix with per-action modes (auto-approve, queue for review, notify and hold)
- Delegation rules for AI agents and team members
- Custom alert rule builder with natural language sentence construction

### Next Best Actions (NBA)
- AI-prioritized action queue with composite scoring
- Urgency badges (time-critical, this week, this month, when convenient)
- Batch actions for grouped opportunities (e.g., rebalance all drifted accounts)
- Deep linking from NBA to execution (rebalance, tax, risk, compliance pages)
- Compliance enforcement with dismiss-reason dialogs and supervisor override
- Effectiveness dashboard with acted-on rate, time-to-action, and dismissed rate
- Customizable weight presets (Balanced, Revenue, Compliance, Relationship)

### Growth & Revenue
- Prospect pipeline with Kanban board and list views
- Pipeline metrics (avg days in stage, win rate, velocity)
- Revenue dashboard with fee breakdown and segment charts
- Book of Business with AUM decomposition, client segmentation, and capacity analysis
- Fee billing workflow with cycle tracking, exception queue, and breakpoint analysis
- Client proposal generation wizard (5 steps: template, generate, review, compliance, finalize)

### Engagement
- Email composition, call logging, and campaign creation
- Meeting prep workspace with structured notes and AI-generated wrap-up summaries
- Team messaging sidebar
- Social media scheduling with approval workflows

### Compliance & Operations
- Workflow center with task pipeline, delegation tracking, and template library
- Workflow step editor with drag reordering and step type inference
- Reconciliation dashboard with 30-day trending, break resolution, and integration health
- Books-and-records archival with SEC 17a-4 WORM compliance display
- Diff view for AI-generated vs. advisor-edited content
- Data quality panel with match rates, open breaks, and integration sync status

### Multi-Currency
- 33 currencies (20 fiat, 10 crypto, 3 stablecoins) with USD cross-rate conversion
- FX rate infrastructure with 5-minute stale time
- International account support (HKD, SGD, EUR, CHF)
- Currency-aware formatting throughout

### Settings & Customization
- AI persona/tone selector with custom style guide
- NBA weight tuning with live preview
- Template library editor with variable insertion and live preview
- Custom alert rules builder
- Notification preferences
- Display settings (reporting currency, compact numbers, date format)

### Self-Guided Demo
- Annotation/demo guide layer with 28 annotations across 12 routes
- Welcome overlay with feature statistics

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript (strict mode) |
| Build | Vite 6 |
| Styling | Tailwind CSS 3.4 + shadcn/ui + Radix primitives |
| State | Zustand (UI) + TanStack Query (server) |
| Tables | TanStack Table with virtual scroll |
| Charts | Recharts + D3 |
| Routing | React Router v6 with lazy-loaded routes |
| Mock API | MSW (Mock Service Worker) — 130+ endpoints |
| Testing | Vitest + Testing Library + Playwright |
| Icons | Lucide React |
| Fonts | Inter (UI) + JetBrains Mono (tabular data) |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type check
npm run type-check

# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
  components/
    layout/         # AppShell, Sidebar, TopBar, Breadcrumbs, StatusBar
    ui/             # shadcn/ui components
  features/         # Feature-based modules (21 domains)
  hooks/            # Shared React hooks
  lib/              # Utilities (currency, formatting)
  mocks/
    data/           # Mock datasets
    handlers/       # MSW request handlers (30 files)
  services/         # Thin fetch wrappers
  store/            # Zustand stores
  types/            # Domain type definitions
```

## Design System

- 12 CSS custom properties for consistent theming (light + dark mode)
- Purple accent (`#7C3AED`) marks all AI-generated content
- Responsive breakpoints: 1920+ (3-col), 1440-1919 (2-col), 1024-1439 (collapsed nav)
- `prefers-reduced-motion` respected for all animations
- Skeleton loading states for every data-fetching component

## License

[MIT](LICENSE)
