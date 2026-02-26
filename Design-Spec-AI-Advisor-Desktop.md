# Design Specification: AdvisorAI Desktop

**Version:** 1.0
**Date:** February 25, 2026
**Companion Document:** PRD-AI-Advisor-Desktop.md
**Status:** Draft

---

## 1. Design System Overview

### 1.1 Design Philosophy

The AdvisorAI Desktop interface is designed for professionals who spend 8–10 hours a day in the application. Every decision optimizes for sustained productivity: high information density without visual clutter, fast scanning patterns, and minimal clicks to complete common actions. The aesthetic is professional, trustworthy, and calm — reflecting the seriousness of managing people's financial lives.

### 1.2 Layout Framework

The application uses a persistent shell with contextual content areas:

```
┌──────────────────────────────────────────────────────────────────┐
│  Top Bar: Logo | Global Search | Notifications | User | AI Chat  │
├────────┬─────────────────────────────────────────────────────────┤
│        │  Breadcrumb: Dashboard > Clients > Johnson Household    │
│  Left  ├─────────────────────────────────────────────────────────┤
│  Nav   │                                                         │
│        │                   Main Content Area                     │
│  ------│                                                         │
│  Dash  │         (Responsive grid, context-dependent)            │
│  Work  │                                                         │
│  Client│                                                         │
│  Port  │                                                         │
│  Book  │                                                         │
│  AI    │                                                         │
│        │                                                         │
│        ├─────────────────────────────────────────────────────────┤
│        │  Status Bar: Connection | Last sync | Data Quality ● | Version│
└────────┴─────────────────────────────────────────────────────────┘
```

**Key dimensions:**
- Left nav: 64px collapsed (icon-only), 240px expanded
- Top bar: 56px height
- Breadcrumb bar: 40px height
- Main content: fluid, min 1024px, optimized for 1440–1920px
- AI Chat panel: slides in from right, 400px wide (expandable to 600px)

### 1.3 Color System

| Token | Value | Usage |
|---|---|---|
| `--surface-primary` | `#FFFFFF` | Main content background |
| `--surface-secondary` | `#F8F9FB` | Cards, panels, sidebar background |
| `--surface-tertiary` | `#F0F2F5` | Nested containers, table headers |
| `--text-primary` | `#1A1D23` | Headings, primary text |
| `--text-secondary` | `#5F6672` | Supporting text, labels |
| `--text-tertiary` | `#9CA3AF` | Placeholders, disabled text |
| `--brand-primary` | `#2563EB` | Primary buttons, active nav, links |
| `--brand-hover` | `#1D4ED8` | Button hover states |
| `--accent-green` | `#059669` | Positive values, success states, gains |
| `--accent-red` | `#DC2626` | Negative values, errors, losses, critical alerts |
| `--accent-amber` | `#D97706` | Warnings, drift alerts, medium priority |
| `--accent-purple` | `#7C3AED` | AI-generated content indicator |

Dark mode inverts the surface tokens while preserving accent semantics.

### 1.4 Typography

| Element | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Page title | Inter | 24px | 600 | 32px |
| Section header | Inter | 18px | 600 | 24px |
| Card title | Inter | 14px | 600 | 20px |
| Body text | Inter | 14px | 400 | 20px |
| Table cell | Inter | 13px | 400 | 18px |
| Caption / label | Inter | 12px | 500 | 16px |
| Monospace (acct #) | JetBrains Mono | 13px | 400 | 18px |

### 1.5 Component Library

The prototype uses a component library built on the following primitives, each with documented states (default, hover, active, disabled, loading, error):

- **Cards:** Surface containers with optional header, body, footer. Used for NBA items, client summaries, account tiles.
- **Tables:** Sortable, filterable data tables with sticky headers, row selection, inline actions, and expandable rows.
- **Charts:** Allocation donuts, performance line charts, bar charts for drift, waterfall charts for flows. Built with a charting library (Recharts or D3).
- **Forms:** Input fields, dropdowns, date pickers, toggles, multi-select filters. Consistent 40px input height.
- **Modals & Drawers:** Right-sliding drawer for detail panels (400–600px). Centered modals for confirmations and short forms.
- **Badges & Tags:** Status indicators (Active, Pending, Flagged), priority labels (P0–P3), category tags.
- **Skeleton loaders:** Shown during data fetch to maintain layout stability.

---

## 2. Screen Specifications

### 2.1 Dashboard — "Today" View

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  METRICS BAR                                                │
│  [AUM: $847M ▲0.3%] [Tasks: 23] [Meetings: 4] [Alerts: 2] │
│  [Net Flows MTD: +$2.1M]                                   │
├───────────────────────────────────┬─────────────────────────┤
│                                   │                         │
│   NEXT BEST ACTION FEED           │   SCHEDULE              │
│   ┌──────────────────────────┐    │   ┌───────────────────┐ │
│   │ ⚡ REBALANCE GROUP        │    │   │ 9:00 AM           │ │
│   │ 5 clients drifted >3%   │    │   │ Johnson Review    │ │
│   │ in US Large Cap          │    │   │ AUM: $4.2M        │ │
│   │ [Review All] [Dismiss]   │    │   │ [Prep]            │ │
│   ├──────────────────────────┤    │   ├───────────────────┤ │
│   │ 📋 RMD PROCESSING        │    │   │ 10:30 AM          │ │
│   │ 3 clients approaching    │    │   │ Miller Prospect   │ │
│   │ Dec 31 deadline          │    │   │ Est AUM: $1.8M    │ │
│   │ [Process Group] [Snooze] │    │   │ [Prep]            │ │
│   ├──────────────────────────┤    │   ├───────────────────┤ │
│   │ 🎂 BIRTHDAY OUTREACH     │    │   │ 1:00 PM           │ │
│   │ 8 clients this week      │    │   │ Team Standup      │ │
│   │ [Draft Messages] [Skip]  │    │   │                   │ │
│   ├──────────────────────────┤    │   ├───────────────────┤ │
│   │ ⚠️ COMPLIANCE REVIEW     │    │   │ 2:30 PM           │ │
│   │ Annual review overdue:   │    │   │ Davis Annual Rev  │ │
│   │ Chen household           │    │   │ AUM: $2.7M        │ │
│   │ [Schedule Review]        │    │   │ [Prep]            │ │
│   └──────────────────────────┘    │   └───────────────────┘ │
│                                   │                         │
│   FILTER BAR:                     │   [Day] [Week] [Agenda] │
│   [Portfolio ✓] [Sales ✓]        │                         │
│   [Planning ✓] [Ops ✓]          │                         │
│   [Compliance ✓] [Marketing ✓]  │                         │
│   Priority: [All ▾]              │                         │
│   Horizon: [This Week ▾]         │                         │
│                                   │                         │
├───────────────────────────────────┴─────────────────────────┤
│  ACTIVITY STREAM (collapsible)                              │
│  10:15 - Trade executed: AAPL sell 500 shares (Davis acct)  │
│  09:45 - Document signed: Johnson IPS (DocuSign)            │
│  09:30 - Account funded: Miller Roth IRA ($25,000)          │
│  Yesterday - Annual review completed: Park household        │
└─────────────────────────────────────────────────────────────┘
```

#### NBA Card Anatomy

```
┌──────────────────────────────────────────────┐
│ [Category Icon] [Category Label]    [Priority]│
│                                     [●●●○]   │
│ Title: Primary action description             │
│ Subtitle: Context (# clients, urgency, value)│
│                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ Client 1 │ │ Client 2 │ │ +3 more  │      │
│ │ $1.2M    │ │ $890K    │ │          │      │
│ └──────────┘ └──────────┘ └──────────┘      │
│                                               │
│ [Primary Action]  [Secondary]  [···]         │
│                    Snooze | Dismiss | Delegate │
└──────────────────────────────────────────────┘
```

#### Interaction Details
- NBA feed is an infinite scroll with virtual rendering (renders only visible cards)
- Filter changes apply instantly (no "Apply" button) with a subtle animation
- Clicking a client chip within a grouped NBA opens a right-side drawer with that client's context without leaving the dashboard
- "Prep" button on meeting cards triggers the AI assistant to generate a meeting brief in the chat panel
- Metrics bar values update in real-time when new data syncs; changes are briefly highlighted with a pulse animation
- Grouped NBA cards expand inline to show individual client details when clicked

---

### 2.2 Workflow Center

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  TABS: [My Actions] [In Process] [Delegated] [Templates]   │
├─────────────────────────────────────────────────────────────┤
│  VIEW: [List ▣] [Kanban ▦]    BULK: [Assign] [Complete]   │
│  FILTER: [Category ▾] [Priority ▾] [Due ▾] [Assignee ▾]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── TODAY (6 items) ────────────────────────────────────    │
│  ☐ Review and approve rebalance trades for drift group     │
│     Portfolio | High | 5 accounts | Est: 20 min             │
│  ☐ Call Robert Johnson to discuss plan update               │
│     Planning | High | Johnson HH | Est: 15 min              │
│  ☐ Complete ACAT follow-up for Miller account               │
│     Operations | Medium | Miller | Est: 10 min              │
│  ☐ Review compliance flag on Chen trade                     │
│     Compliance | Critical | Chen HH | Est: 5 min            │
│                                                             │
│  ── THIS WEEK (12 items) ──────────────────────────────    │
│  ☐ Prepare quarterly review decks (batch: 8 clients)       │
│     Sales | Medium | Multiple | Est: 2 hours                │
│  ☐ Process RMD distributions (batch: 3 clients)            │
│     Portfolio | High | Multiple | Due: Dec 31               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### In-Process Tracker (Tab)

```
┌──────────────────────────────────────────────────────────────┐
│  PROCESS TYPE: [All ▾]    STATUS: [All ▾]    SEARCH: [___] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Miller Roth IRA — Account Opening (Schwab)                  │
│  ● Docs ──● KYC ──● OFAC ──● Review ──○ Submit ──○ Fund ──○ Active│
│  Status: Supervisory review | NIGO: 0 | ETA: 2 business days│
│  Owner: Operations Team | SLA: On Track | [Add Note] [Escalate]│
│  ───────────────────────────────────────────────────────     │
│  Davis Joint Account — ACAT Transfer                         │
│  ● Initiated ──● Submitted ──○ In Transit ──○ Settled       │
│  Status: Submitted to Schwab | ETA: 5 business days          │
│  Owner: Custodian | [Add Note] [View Details]                │
│  ───────────────────────────────────────────────────────     │
│  Johnson IPS — Document Signature                            │
│  ● Sent ──● Viewed ──○ Signed ──○ Filed                     │
│  Status: Viewed by client 2 hours ago | [Resend] [Cancel]    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Delegation Drawer (opens from any task's "Delegate" button)

```
┌──────────────────────────────────────┐
│  DELEGATE TASK                [×]    │
│  "Prepare quarterly review decks"    │
├──────────────────────────────────────┤
│                                      │
│  ASSIGN TO:                          │
│  ┌────────────────────────────────┐  │
│  │ 👤 Team Member                 │  │
│  │    [Sarah Kim (CSA)        ▾]  │  │
│  │    Due: [Feb 28, 2026      ▾]  │  │
│  │    Notes: [_______________]    │  │
│  ├────────────────────────────────┤  │
│  │ 🤖 AI Agent                    │  │
│  │    Action: Generate review     │  │
│  │    decks for 8 clients using   │  │
│  │    Q4 Review template          │  │
│  │    Approval: Queue for review  │  │
│  │    [View AI permissions]       │  │
│  ├────────────────────────────────┤  │
│  │ 🔄 Both (AI prepares → human  │  │
│  │    reviews)                    │  │
│  │    AI generates → Sarah reviews│  │
│  └────────────────────────────────┘  │
│                                      │
│  ☐ Create standing rule for this     │
│    task type                         │
│                                      │
│  [Cancel]            [Delegate]      │
└──────────────────────────────────────┘
```

#### Delegated Tab

```
┌─────────────────────────────────────────────────────────────┐
│  FILTER: [All ▾] [To Humans ▾] [To AI ▾] [Status ▾]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🤖 Quarterly review decks (batch: 8 clients)              │
│     Delegated to: AI Agent | Status: 5 of 8 complete       │
│     ████████████████░░░░░░░ 62%                             │
│     [View Completed] [Pause]                                │
│  ───────────────────────────────────────────────────────    │
│  🤖 Meeting prep brief — Johnson quarterly review           │
│     Delegated to: AI Agent | Status: ✅ Complete            │
│     Completed 2 hours ago | [Review & Approve] [Reject]     │
│  ───────────────────────────────────────────────────────    │
│  👤 ACAT follow-up for Miller account                       │
│     Delegated to: Sarah Kim (CSA) | Status: In Progress     │
│     Assigned yesterday | Due: Feb 27                        │
│  ───────────────────────────────────────────────────────    │
│  🤖 Birthday email drafts — week of Feb 24                  │
│     Delegated to: AI Agent | Status: ✅ Complete            │
│     8 emails drafted | [Review All] [Approve & Send]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Workflow Templates Tab

```
┌─────────────────────────────────────────────────────────────┐
│  [+ New Workflow]  [Import from Firm Library]                │
│  FILTER: [All ▾] [My Workflows ▾] [Firm Templates ▾]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ Quarterly Review Prep (Custom)           [Active]       │
│     Trigger: 48 hours before quarterly review meeting       │
│     Steps: 8 (5 AI, 1 approval gate, 2 human)              │
│     Last run: Feb 23 — Johnson HH | Next: Feb 27 — Davis   │
│     [Edit] [View History] [Pause] [Duplicate]               │
│  ───────────────────────────────────────────────────────    │
│  📋 New Client Onboarding (Firm Template)    [Active]       │
│     Trigger: Manual (on new client creation)                │
│     Steps: 15 (3 AI, 4 approval gates, 8 human)            │
│     Active instances: 2 (Miller, Park)                      │
│     [Edit Copy] [View History]                              │
│  ───────────────────────────────────────────────────────    │
│  🎂 Weekly Birthday Outreach (Custom)        [Active]       │
│     Trigger: Every Monday at 8:00 AM                        │
│     Steps: 3 (2 AI, 1 approval gate)                        │
│     Last run: Feb 24 — 8 clients                            │
│     [Edit] [View History] [Pause]                           │
│  ───────────────────────────────────────────────────────    │
│  📄 Annual Review Cycle (Firm Template)      [Draft]        │
│     Trigger: 30 days before review anniversary              │
│     Steps: 10 (4 AI, 2 approval gates, 4 human)            │
│     [Edit Copy] [Activate]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Workflow Step Editor (opens when editing a template)

```
┌─────────────────────────────────────────────────────────────┐
│  WORKFLOW: Quarterly Review Prep               [Save] [×]   │
│  Trigger: [48 hours before ▾] [quarterly review meeting ▾]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 🤖 Pull performance data & generate summary             │
│     Owner: AI Agent | Input: PMS data | Output: Document    │
│     [Edit Step] [Remove] [↕ Drag to reorder]               │
│        ↓                                                    │
│  2. 🤖 Analyze drift & flag rebalancing opportunities        │
│     Owner: AI Agent | Input: PMS positions | Output: Report │
│        ↓                                                    │
│  3. 🤖 Review plan probability & generate snapshot           │
│     Owner: AI Agent | Input: Planning system | Output: Doc  │
│        ↓                                                    │
│  4. 🤖 Compile open items & status updates                   │
│     Owner: AI Agent | Input: CRM + Workflows | Output: List │
│        ↓                                                    │
│  5. 🤖 Draft meeting agenda with talking points              │
│     Owner: AI Agent | Input: Steps 1–4 | Output: Agenda    │
│        ↓                                                    │
│  6. 🤖 Assemble meeting prep brief & notify advisor          │
│     Owner: AI Agent | Input: All above | Output: Brief      │
│        ↓                                                    │
│  7. 🔒 APPROVAL GATE: Advisor reviews prep brief             │
│     Owner: Advisor | Action: Approve / Edit / Reject        │
│        ↓ (on approve)                                       │
│  8. 🤖 Send confirmation email with agenda                   │
│     Owner: AI Agent | Template: Meeting Confirmation        │
│                                                             │
│  [+ Add Step]  [+ Add Approval Gate]  [+ Add Branch]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Details
- List view supports drag-and-drop reordering for manual prioritization
- Kanban columns: To Do, In Progress, Waiting, Complete (customizable)
- Clicking any task row opens a right drawer with full detail, related client context, and action buttons
- Process tracker stages are clickable to show timestamp, responsible party, and notes for each completed stage
- Bulk selection checkbox on each row; toolbar appears when items are selected
- Task time estimates are AI-generated based on historical advisor behavior patterns
- Delegation drawer shows AI agent option with a purple accent border; "View AI permissions" links to Settings → AI & Agentic AI
- AI-delegated tasks show a purple 🤖 icon and progress bar; completed AI work shows "Review & Approve" as the primary action
- Workflow template editor uses a vertical step sequence with drag handles; approval gates are visually distinct (lock icon, amber border)
- "Create standing rule" checkbox on the delegation drawer opens a rule builder inline (trigger + action + approval requirement)
- Workflow execution history is accessible per-template, showing each run with timestamps, artifacts, and advisor decisions

---

### 2.3 Client Screen

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT HEADER                                              │
│  ┌─────┐  Robert Johnson           Tier: Platinum           │
│  │Photo│  Johnson Household         Primary Advisor: You     │
│  └─────┘  Age 62 | Risk: Moderate   Client Since: 2014      │
│           Total Relationship: $4.2M  Last Contact: 3 days   │
│  [📞 Call] [✉ Email] [📅 Schedule] [+ Task] [Open CRM ↗]  │
├─────────────────────────────────────────────────────────────┤
│  TABS: [Overview] [Accounts] [Planning] [Documents]         │
│        [Activity] [Notes]                                   │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│  FINANCIAL SUMMARY           │  AI SUMMARY                  │
│  ┌────────────────────────┐  │  ┌────────────────────────┐  │
│  │ Net Worth: $6.8M       │  │  │ 🤖 Robert is 3 years  │  │
│  │ Investable: $4.2M      │  │  │ from target retirement │  │
│  │ Held-Away Est: $1.1M   │  │  │ at 65. His plan shows  │  │
│  │ Real Estate: $1.2M     │  │  │ 82% probability but    │  │
│  │ Liabilities: $380K     │  │  │ the recent market      │  │
│  └────────────────────────┘  │  │ decline may require    │  │
│                              │  │ revisiting withdrawal  │  │
│  ASSET ALLOCATION            │  │ assumptions. He also   │  │
│  ┌────────────────────────┐  │  │ mentioned interest in  │  │
│  │   [Donut Chart]        │  │  │ funding a 529 for new  │  │
│  │   US Eq: 42% (T: 40%) │  │  │ grandchild at last     │  │
│  │   Intl Eq: 18% (T:20%)│  │  │ meeting.               │  │
│  │   Fixed: 30% (T: 30%) │  │  │                        │  │
│  │   Alt: 5% (T: 5%)     │  │  │ Open items: IPS review │  │
│  │   Cash: 5% (T: 5%)    │  │  │ (overdue), RMD for     │  │
│  │   Overall drift: 2.1% │  │  │ Traditional IRA.       │  │
│  └────────────────────────┘  │  └────────────────────────┘  │
│                              │                              │
│  PERFORMANCE                 │  OPEN ITEMS (4)              │
│  YTD: +8.2% (Bench: +7.9%) │  ☐ Annual IPS review         │
│  1Y: +12.1% (Bench: +11.4%)│  ☐ RMD distribution          │
│                              │  ☐ 529 account setup         │
│  PLAN GOALS                  │  ☐ Beneficiary update        │
│  Retirement (2029): 82% 🟡  │                              │
│  Education 529:    N/A  ⚪   │                              │
│  Legacy/Estate:    91% 🟢   │                              │
│  Income ($180K):   78% 🟡   │                              │
│  Overall Health:   83%       │                              │
├──────────────────────────────┴──────────────────────────────┤
│  ACCOUNTS                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Account          │ Type    │ Custodian │ Value    │Drift ││
│  │ Johnson Joint    │ Joint   │ Schwab    │ $1.8M   │ 1.2% ││
│  │ Robert Trad IRA  │ IRA     │ Schwab    │ $1.1M   │ 2.8% ││
│  │ Robert Roth IRA  │ Roth    │ Schwab    │ $420K   │ 0.5% ││
│  │ Johnson Trust UMA│ Trust   │ Fidelity  │ $880K   │ 1.9% ││
│  │  └─ Core Equity  │ Sleeve  │           │ $440K   │ 2.1% ││
│  │  └─ Fixed Income │ Sleeve  │           │ $264K   │ 0.8% ││
│  │  └─ Alternatives │ Sleeve  │           │ $176K   │ 1.4% ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Details
- Client header is sticky — remains visible as the advisor scrolls through tabs
- AI Summary has a "Refresh" button and a "Regenerate with more detail" option
- The purple AI indicator (`🤖` / purple left border) distinguishes AI-generated content from data-sourced content
- Allocation donut chart is interactive: hovering a segment shows detail; clicking opens the portfolio screen filtered to that asset class
- Account rows with UMA structure expand/collapse to show sleeve detail
- Drift values are color-coded: green (within tolerance), amber (approaching threshold), red (exceeds threshold)
- "Open in CRM" button opens the client record in the source CRM in a new tab
- Each tab transition is animated with a horizontal slide; data loads progressively with skeleton states

---

### 2.4 Household Screen

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  HOUSEHOLD: Johnson Family          Total: $4.2M            │
│  Members: Robert (62), Linda (59)   Accounts: 6             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HOUSEHOLD COMPOSITION                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │        ┌──────────┐   ┌──────────┐          │            │
│  │        │ Robert   │───│ Linda    │          │            │
│  │        │ 62, Prim.│   │ 59, Sp.  │          │            │
│  │        │ $2.4M    │   │ $1.8M    │          │            │
│  │        └──────────┘   └──────────┘          │            │
│  │              │                               │            │
│  │     ┌────────┴────────┐                      │            │
│  │  ┌──────┐        ┌──────┐                    │            │
│  │  │Sarah │        │ Mark │                    │            │
│  │  │ 35   │        │ 32   │                    │            │
│  │  │Benef.│        │Benef.│                    │            │
│  │  └──────┘        └──────┘                    │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
│  CONSOLIDATED VIEW       │  HOUSEHOLD GOALS (per-goal)      │
│  Combined AUM: $4.2M     │  Retirement (2029): 82% 🟡 ████░│
│  Combined Net Worth: $6.8M│   ↳ Driver: withdrawal rate     │
│  Combined Alloc:          │  Education 529: N/A ⚪ [Setup]  │
│  [Stacked bar chart]     │  Legacy / Estate: 91% 🟢 █████  │
│  HH Tax-Loss Opps: $42K  │  Annual Income: 78% 🟡 ████░   │
│                          │   ↳ Driver: inflation assumption │
│  HELD-AWAY ASSETS         │  Overall Plan Health: 83%        │
│  401(k) prior employer:   │                                  │
│    $285K (est.) ⓘ        │                                  │
│  Outside brokerage:       │                                  │
│    $150K (est.) ⓘ        │                                  │
│  [Create Consolidation    │                                  │
│   Proposal]               │                                  │
│  ACCOUNTS MATRIX                                            │
│  ┌──────────────────────────────────────────────┐           │
│  │Owner  │Account       │Type │Value  │Model│Drft│          │
│  │Robert │Joint         │Jnt  │$1.8M  │Mod  │1.2%│          │
│  │Robert │Trad IRA      │IRA  │$1.1M  │Mod  │2.8%│          │
│  │Robert │Roth IRA      │Roth │$420K  │Grwth│0.5%│          │
│  │Joint  │Trust UMA     │Trst │$880K  │UMA  │1.9%│          │
│  │Linda  │Linda Roth    │Roth │$380K  │Grwth│1.1%│          │
│  │Linda  │Linda 401k    │401k │$520K  │TDF  │0.0%│          │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Details
- Family tree nodes are clickable — opens that member's client screen
- Consolidated vs. individual toggle applies to allocation chart and performance display
- Tax-loss harvesting opportunity figure is calculated across all taxable accounts in the household, respecting wash sale rules across accounts
- Accounts matrix supports row-level actions (right-click context menu: view detail, rebalance, trade, create task)
- Goal progress indicators use per-goal probability (not a single aggregate gauge): 🟢 ≥90%, 🟡 70–89%, 🔴 <70%, ⚪ not started/no data. Each goal shows its primary shortfall driver (e.g., "withdrawal rate," "inflation assumption," "savings rate")
- Held-away assets panel shows estimated values with a "last updated" timestamp and info tooltip explaining the data source. "Create Consolidation Proposal" opens the AI chat with a pre-filled prompt to generate a personalized consolidation pitch

---

### 2.5 Portfolio Screen

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  CONTEXT: Robert Johnson > Household > All Accounts         │
│  [Individual ▾] [All Accounts ▾]                            │
├──────────────────────────────┬──────────────────────────────┤
│  ALLOCATION vs TARGET        │  PERFORMANCE                 │
│  ┌────────────────────────┐  │  ┌────────────────────────┐  │
│  │ [Side-by-side bars]    │  │  │ [Line chart]           │  │
│  │ US Eq:  ██████░ 42/40% │  │  │ Portfolio ---          │  │
│  │ Intl:   ████░░░ 18/20% │  │  │ Benchmark ...          │  │
│  │ Fixed:  ██████░ 30/30% │  │  │                        │  │
│  │ Alt:    █░░░░░░  5/5%  │  │  │ Period: [YTD ▾]       │  │
│  │ Cash:   █░░░░░░  5/5%  │  │  │ TWR: +8.2%            │  │
│  │                        │  │  │ Bench: +7.9%           │  │
│  │ [Generate Rebalance]   │  │  │ Excess: +0.3%          │  │
│  └────────────────────────┘  │  └────────────────────────┘  │
├──────────────────────────────┴──────────────────────────────┤
│  TABS: [Holdings] [Risk] [Attribution] [Trading]            │
├─────────────────────────────────────────────────────────────┤
│  HOLDINGS                                                    │
│  Group by: [Asset Class ▾]   Search: [____________]         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │Security    │Shares│Mkt Value│ Cost  │ Gain/Loss│Weight ││
│  │── US Equity (42.1%) ─────────────────────────────────── ││
│  │AAPL        │ 500  │ $94,250 │$71,500│ +$22,750 │ 2.2%  ││
│  │MSFT        │ 300  │$126,300 │$89,100│ +$37,200 │ 3.0%  ││
│  │VTI         │1,200 │$312,000 │$278K  │ +$34,000 │ 7.4%  ││
│  │...         │      │         │       │          │       ││
│  │── International Equity (18.0%) ──────────────────────── ││
│  │VXUS        │2,100 │$126,000 │$118K  │  +$8,000 │ 3.0%  ││
│  │...         │      │         │       │          │       ││
│  └─────────────────────────────────────────────────────────┘│
│  Total: $4,216,320 | Unrealized Gain: +$412,800             │
└─────────────────────────────────────────────────────────────┘
```

#### Risk Tab

```
┌─────────────────────────────────────────────────────────────┐
│  RISK METRICS                    │  FACTOR EXPOSURE          │
│  Std Dev (ann):     12.4%        │  ┌─────────────────────┐  │
│  Sharpe Ratio:      0.82         │  │ Market:  ████░ 0.94 │  │
│  Sortino Ratio:     1.14         │  │ Size:    ██░░░ 0.12 │  │
│  Max Drawdown:     -18.2%        │  │ Value:   █░░░░-0.08 │  │
│  Beta:              0.94         │  │ Momentum:██░░░ 0.21 │  │
│  Tracking Error:    2.1%         │  │ Quality: ███░░ 0.35 │  │
│                                  │  └─────────────────────┘  │
│  STRESS SCENARIOS                                            │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Scenario              │ Portfolio │ Benchmark    │       │
│  │ 2008 Financial Crisis │  -38.2%  │   -41.1%     │       │
│  │ 2020 COVID Drawdown   │  -22.4%  │   -23.8%     │       │
│  │ Rising Rates (+200bp) │   -6.8%  │    -7.2%     │       │
│  │ Tech Sector -30%      │  -11.2%  │    -9.8%     │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Details
- Allocation bars are clickable — drills into that asset class's holdings
- "Generate Rebalance" button opens a trade preview drawer showing proposed trades with tax impact, before sending to OMS
- Holdings table supports column sorting, inline expand (shows lot-level detail), and multi-row selection for batch trade entry
- Performance chart supports click-and-drag date range selection for custom period analysis
- Risk metrics show tooltips with definitions on hover
- Stress scenario rows expand to show position-level impact detail

---

### 2.6 Account Screen

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ACCOUNT HEADER                                             │
│  Johnson Family Trust UMA    │ Trust │ Fidelity │ Active    │
│  Account #: ****4521         │ Opened: 2018-03-15           │
│  Value: $880,420   Cost: $742,100   Gain: +$138,320 (+18.6%)│
├─────────────────────────────────────────────────────────────┤
│  UMA SLEEVE BREAKDOWN                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │Sleeve         │Strategy    │Target│Actual│ Value  │Drift ││
│  │Core Equity    │Large Cap   │ 50%  │ 50%  │$440K  │ 2.1% ││
│  │Fixed Income   │Core Bond   │ 30%  │ 30%  │$264K  │ 0.8% ││
│  │Alternatives   │Hedged Eq   │ 20%  │ 20%  │$176K  │ 1.4% ││
│  │─── Cash ──────│Centralized │  --  │ 0.4% │ $3.5K │  --  ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ OVERLAY MANAGEMENT                                      ││
│  │ Tax Mgmt: Active (harvested $12K YTD)                   ││
│  │ ESG Screen: Tobacco, Weapons exclusion active           ││
│  │ Concentrated Stock: None                                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  TABS: [Positions] [Transactions] [Tax Lots] [Documents]    │
├─────────────────────────────────────────────────────────────┤
│  POSITIONS (by Sleeve)                                       │
│  ── Core Equity Sleeve ──                                    │
│  VTI        │ 1,200 │ $312,000 │ +$34,000 │ 70.9%          │
│  AAPL       │   200 │  $37,700 │  +$9,100 │  8.6%          │
│  ...                                                         │
│  ── Fixed Income Sleeve ──                                   │
│  AGG        │   800 │ $158,400 │  -$4,200 │ 60.0%          │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Details
- Sleeve rows expand to show positions within that sleeve
- Sleeve-level rebalance is available independently of account-level rebalance
- Overlay management section shows active overlays with YTD impact metrics
- Tax lot view shows individual lots with holding period, wash sale flags, and harvesting eligibility
- Transaction history supports export to CSV and PDF
- Documents tab shows account-specific documents (statements, confirms, tax forms) with auto-filing from custodian feeds

---

### 2.7 Book of Business Screen

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  BOOK OVERVIEW                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │AUM       │ │HH Count  │ │Revenue   │ │Eff. Fee  │      │
│  │$847.2M   │ │ 187      │ │$6.8M     │ │ 80bps    │      │
│  │▲ 2.1% MTD│ │ +3 YTD   │ │▲ vs plan │ │▼ 2bps YoY│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Organic   │ │Retention │ │Rev Conc. │ │Attrition │      │
│  │Growth    │ │Rate      │ │Top 10    │ │YTD       │      │
│  │ 4.2%     │ │ 97.1%    │ │ 28%      │ │ 3 HH     │      │
│  │▲ vs peer │ │          │ │          │ │Fee: 1    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────────────────────┬──────────────────────────┐   │
│  │ AUM DECOMPOSITION        │ CLIENT SEGMENTATION      │   │
│  │ [Waterfall: market,      │ ┌──────────────────────┐ │   │
│  │  new clients, existing   │ │ Platinum (>$5M): 12  │ │   │
│  │  inflows, withdrawals,   │ │ Gold ($1-5M):    45  │ │   │
│  │  attrition]              │ │ Silver ($500K-1M):62 │ │   │
│  │                          │ │ Bronze (<$500K):  68 │ │   │
│  │                          │ └──────────────────────┘ │   │
│  └──────────────────────────┴──────────────────────────┘   │
│                                                             │
│  TABS: [All Clients] [Pipeline] [Capacity] [Billing]        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │Household      │AUM     │Revenue │Last Review│Segment   ││
│  │Johnson Family │ $4.2M  │ $33.6K │ 45 days  │ Gold     ││
│  │Williams Trust │ $8.1M  │ $56.7K │ 12 days  │ Platinum ││
│  │Chen Family    │ $2.8M  │ $22.4K │ 92 days ⚠│ Gold     ││
│  │Davis Ret.     │ $1.9M  │ $15.2K │ 28 days  │ Gold     ││
│  │...                                                      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Details — Book of Business
- AUM decomposition waterfall shows the breakdown of AUM change (market appreciation, new client assets, existing client inflows, withdrawals, client attrition) over a configurable period (MTD, QTD, YTD)
- Organic growth rate highlights in green if above peer benchmark, red if below
- Revenue concentration figure is clickable — drills into a ranked list of households by revenue contribution
- Attrition row shows count by reason category (fee, competitive, life event, service) on hover
- Effective fee rate trend shows a sparkline over the last 8 quarters; a downward trend triggers a subtle amber warning
- Billing tab (see Section 2.7.1) provides fee cycle status and exception management

---

### 2.7.1 Fee Billing View (within Book of Business)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  BILLING CYCLE: Q1 2026            Status: Review Phase      │
│  ○ Valuation ──● Calculation ──● Review ──○ Collection       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FEE SUMMARY                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Total Fees│ │Avg Fee   │ │Exceptions│ │vs Prior Q │      │
│  │$1.72M    │ │ 80bps    │ │ 4 ⚠️      │ │ +2.1%    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  HOUSEHOLD FEE DETAIL                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │Household      │AUM Basis│Fee Sched│Fee Amt │Method│Flag ││
│  │Williams Trust │ $8.1M   │Tiered   │$56,700 │Debit │     ││
│  │Johnson Family │ $4.2M   │Flat 80bp│$33,600 │Debit │     ││
│  │Chen Family    │ $2.8M   │Tiered   │$21,000 │Debit │ ⚠️  ││
│  │  ↳ Exception: nearing breakpoint ($200K to next tier)   ││
│  │Davis Ret.     │ $1.9M   │Flat 80bp│$15,200 │Invoice│    ││
│  │Miller (new)   │ $1.2M   │Flat 80bp│ $4,800 │Debit │ Pro ││
│  │  ↳ Prorated: account opened mid-quarter                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  BREAKPOINT OPPORTUNITIES                                   │
│  Chen Family: $200K additional AUM → next tier (75bp→65bp) │
│  Park Family: $50K additional AUM → next tier (85bp→75bp)  │
│  [Create Consolidation NBA]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.7.2 Data Quality & Reconciliation Panel (accessible from Status Bar)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  DATA QUALITY DASHBOARD                             [×]     │
│  Overall Health: 99.1%  🟢   Last check: 10 min ago        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RECONCILIATION STATUS                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │Category         │Match Rate│Breaks│Oldest Break│Status  ││
│  │Positions        │ 99.4%    │  3   │ 2 days     │ 🟢    ││
│  │Cash Balances    │ 99.8%    │  1   │ 1 day      │ 🟢    ││
│  │Transactions     │ 98.2%    │  7   │ 5 days     │ 🟡    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  OPEN BREAKS (11)                                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │Account      │Type        │Category  │Amount │Age │Action││
│  │Davis Joint  │Position    │Corp Actn │ 50 sh │2d  │[Fix] ││
│  │Miller Roth  │Transaction │Timing    │$2,500 │1d  │[Fix] ││
│  │Chen Trust   │Transaction │Pricing   │  $120 │5d  │[Fix] ││
│  │...          │            │          │       │    │      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  INTEGRATION STATUS                                         │
│  Schwab feed: ✅ Last sync 8:15 AM                          │
│  Fidelity feed: ✅ Last sync 8:22 AM                        │
│  Orion PMS: ✅ Last sync 8:30 AM                            │
│  eMoney: ✅ Last sync 7:00 AM                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.8 AI Assistant Chat Panel

#### Layout

```
┌──────────────────────────────────────┐
│  AI ASSISTANT              [─] [□] [×]│
│  Context: Johnson Household           │
├──────────────────────────────────────┤
│                                      │
│  👤 What's the Johnson household's   │
│     total tech exposure?             │
│                                      │
│  🤖 Across all 6 Johnson accounts,  │
│     technology exposure is 22.4%     │
│     ($942K) of the $4.2M total:     │
│                                      │
│     ┌────────────────────────────┐   │
│     │ Account   │ Tech $ │ Tech%│   │
│     │ Joint     │ $412K  │ 22.9%│   │
│     │ Trad IRA  │ $253K  │ 23.0%│   │
│     │ Roth IRA  │  $88K  │ 21.0%│   │
│     │ Trust UMA │ $189K  │ 21.5%│   │
│     └────────────────────────────┘   │
│     ⓘ Source: PMS position data      │
│     as of 2/25/2026                  │
│                                      │
│  👤 Generate a meeting prep brief    │
│     for tomorrow's review            │
│                                      │
│  🤖 Here's the meeting brief for     │
│     Robert Johnson:                  │
│                                      │
│     ┌────────────────────────────┐   │
│     │ 📄 Johnson_Review_Brief    │   │
│     │    .docx                   │   │
│     │ [Open] [Edit] [Send]       │   │
│     └────────────────────────────┘   │
│                                      │
│     Key talking points:              │
│     • Plan at 82% — discuss          │
│       withdrawal assumptions         │
│     • 529 setup for new grandchild   │
│     • RMD processing for Trad IRA    │
│     • IPS annual review overdue      │
│                                      │
│  ⓘ AI-generated · Review before use │
├──────────────────────────────────────┤
│  [📎] [Type a message...      ] [→] │
│  Suggested: "Draft follow-up email"  │
│  Suggested: "Show risk analysis"     │
└──────────────────────────────────────┘
```

#### Interaction Details
- Chat panel is accessible globally via a persistent icon in the top bar or keyboard shortcut (Ctrl/Cmd + J)
- Context automatically updates based on the current screen (e.g., if on Johnson client screen, chat context = Johnson)
- Context can be manually overridden via a dropdown at the top of the panel
- AI-generated content has a purple left border and a footer label ("AI-generated · Review before use")
- Document generation produces a preview card with Open, Edit, and Send/Share actions
- Data tables within chat responses are interactive — sortable and clickable to navigate to the source entity
- Suggested prompts appear below the input field, contextually generated based on the current screen and recent activity
- The panel supports three sizes: collapsed (icon only), standard (400px), expanded (600px)
- Chat history is searchable and filterable by date and topic
- The AI cites its data sources inline (e.g., "Source: PMS position data as of [date]")

---

### 2.9 Settings & Configuration Screens

#### Layout — Settings Overview

```
┌─────────────────────────────────────────────────────────────┐
│  SETTINGS                                                    │
├────────────────────┬────────────────────────────────────────┤
│                    │                                        │
│  SECTIONS          │  AI & AGENTIC AI                       │
│  ─────────────     │                                        │
│  ● AI & Agentic AI │  COMMUNICATION STYLE                   │
│  ○ NBA Engine      │  Tone: [Formal ○] [Balanced ●] [Casual○]│
│  ○ Notifications   │                                        │
│  ○ Workflows       │  Style guide:                          │
│  ○ Delegation Rules│  ┌──────────────────────────────────┐  │
│  ○ Templates       │  │ I prefer short, direct emails.   │  │
│  ○ Appearance      │  │ Never use exclamation points.    │  │
│  ○ Integrations    │  │ Always reference the client's    │  │
│                    │  │ goals by name. Sign off with     │  │
│                    │  │ "Best regards" not "Best."       │  │
│                    │  └──────────────────────────────────┘  │
│                    │                                        │
│                    │  AGENTIC AI PERMISSIONS                 │
│                    │  ┌──────────────────────────────────┐  │
│                    │  │ Action Type    │ Permission      │  │
│                    │  │ Doc generation │ ✅ Auto-approve │  │
│                    │  │ Email drafting │ 🔶 Queue review │  │
│                    │  │ Data queries   │ ✅ Auto-approve │  │
│                    │  │ Trade suggest. │ 🔴 Disabled     │  │
│                    │  │ CRM updates    │ 🔴 Disabled     │  │
│                    │  │ Meeting sched. │ 🔶 Queue review │  │
│                    │  └──────────────────────────────────┘  │
│                    │  🔒 Firm policy: Trade suggestions      │
│                    │     require manual advisor approval     │
│                    │                                        │
│                    │  VERBOSITY: [Concise ○][Balanced ●]    │
│                    │             [Detailed ○]               │
│                    │  Proactive suggestions: [ON ●] [OFF ○] │
│                    │  Learn from my behavior: [ON ●] [OFF ○]│
│                    │                                        │
│                    │  EXECUTION SCHEDULE                     │
│                    │  AI agent active hours:                 │
│                    │  [6:00 AM ▾] to [10:00 PM ▾]          │
│                    │  ☐ Allow critical compliance tasks      │
│                    │    outside active hours                 │
│                    │                                        │
└────────────────────┴────────────────────────────────────────┘
```

#### Layout — NBA Engine Settings

```
┌────────────────────┬────────────────────────────────────────┐
│                    │  NBA ENGINE                             │
│  SECTIONS          │                                        │
│  ─────────────     │  SCORING WEIGHTS                       │
│  ○ AI & Agentic AI │  Preset: [Custom ▾]                    │
│  ● NBA Engine      │                                        │
│  ○ Notifications   │  Urgency      ████████████░░░░ 30%     │
│  ○ Workflows       │  Impact       ██████████░░░░░░ 25%     │
│  ○ Delegation Rules│  Efficiency   ████████░░░░░░░░ 20%     │
│  ○ Templates       │  Relationship ██████░░░░░░░░░░ 15%     │
│  ○ Appearance      │  Confidence   ████░░░░░░░░░░░░ 10%     │
│  ○ Integrations    │                                        │
│                    │  Presets: [Balanced] [Revenue-focused]  │
│                    │  [Compliance-first] [Relationship]      │
│                    │  [Save as Custom Preset]                │
│                    │                                        │
│                    │  CATEGORY SETTINGS                      │
│                    │  ┌──────────────────────────────────┐  │
│                    │  │Category    │Enabled│Min Priority │  │
│                    │  │Portfolio   │  ✅   │ Low         │  │
│                    │  │Sales       │  ✅   │ Low         │  │
│                    │  │Planning    │  ✅   │ Medium      │  │
│                    │  │Operations  │  ✅   │ Low         │  │
│                    │  │Compliance  │  ✅   │ All 🔒      │  │
│                    │  │Marketing   │  ☐    │ —           │  │
│                    │  └──────────────────────────────────┘  │
│                    │  🔒 Compliance cannot be disabled       │
│                    │                                        │
│                    │  CUSTOM ALERT RULES                     │
│                    │  ┌──────────────────────────────────┐  │
│                    │  │ "Plan probability < 75%"  [Edit] │  │
│                    │  │ "Cash > $50K for 30+ days" [Edit]│  │
│                    │  │ "No contact in 90+ days"  [Edit] │  │
│                    │  └──────────────────────────────────┘  │
│                    │  [+ Add Custom Alert Rule]              │
│                    │                                        │
│                    │  GROUPING                               │
│                    │  Min group size: [3 ▾]                  │
│                    │  Max group size: [20 ▾]                 │
│                    │  Group by: [Action type ✓] [Model ✓]   │
│                    │           [Segment ☐]                  │
│                    │                                        │
└────────────────────┴────────────────────────────────────────┘
```

#### Layout — Notification Settings

```
┌────────────────────┬────────────────────────────────────────┐
│                    │  NOTIFICATIONS & ALERTS                 │
│  SECTIONS          │                                        │
│  ─────────────     │  DELIVERY CHANNELS                     │
│  ○ AI & Agentic AI │  In-app:    [Always on 🔒]            │
│  ○ NBA Engine      │  Email:     [Daily digest ▾]           │
│  ● Notifications   │  Desktop:   [Critical only ▾]          │
│  ○ Workflows       │                                        │
│  ○ Delegation Rules│  QUIET HOURS                           │
│  ○ Templates       │  [ON ●] 8:00 PM to 7:00 AM            │
│  ○ Appearance      │  ☐ Exception: Critical compliance      │
│  ○ Integrations    │                                        │
│                    │  PER-CATEGORY RULES                     │
│                    │  ┌──────────────────────────────────┐  │
│                    │  │Category        │In-App  │Email   │  │
│                    │  │Compliance      │Realtime│Realtime│  │
│                    │  │Trade execution │Realtime│Off     │  │
│                    │  │Workflow changes│Realtime│Batched │  │
│                    │  │NBA new items   │Morning │Digest  │  │
│                    │  │AI completions  │Realtime│Off     │  │
│                    │  │Team mentions   │Realtime│Realtime│  │
│                    │  │Client activity │Daily   │Digest  │  │
│                    │  └──────────────────────────────────┘  │
│                    │                                        │
└────────────────────┴────────────────────────────────────────┘
```

#### Layout — Template Library

```
┌────────────────────┬────────────────────────────────────────┐
│                    │  TEMPLATE LIBRARY                       │
│  SECTIONS          │                                        │
│  ─────────────     │  FILTER: [All Types ▾] [Search____]   │
│  ○ AI & Agentic AI │                                        │
│  ○ NBA Engine      │  EMAIL TEMPLATES (6)                   │
│  ○ Notifications   │  ├─ Prospect follow-up — warm  [Edit]  │
│  ○ Workflows       │  ├─ Prospect follow-up — cold  [Edit]  │
│  ○ Delegation Rules│  ├─ Meeting confirmation        [Edit]  │
│  ● Templates       │  ├─ Birthday message            [Edit]  │
│  ○ Appearance      │  ├─ Review follow-up            [Edit]  │
│  ○ Integrations    │  └─ Referral thank you          [Edit]  │
│                    │                                        │
│                    │  MEETING PREP BRIEFS (2)                │
│                    │  ├─ Standard review brief       [Edit]  │
│                    │  └─ Prospect meeting brief      [Edit]  │
│                    │                                        │
│                    │  PROPOSALS (2)                          │
│                    │  ├─ Standard investment proposal [Edit]  │
│                    │  └─ Retirement-focused proposal  [Edit]  │
│                    │                                        │
│                    │  PRESENTATIONS (1)                      │
│                    │  └─ Quarterly review deck        [Edit]  │
│                    │                                        │
│                    │  PROMPT PRESETS (3)                      │
│                    │  ├─ "Quick portfolio summary"    [Edit]  │
│                    │  ├─ "Draft review agenda"        [Edit]  │
│                    │  └─ "Compliance check"           [Edit]  │
│                    │                                        │
│                    │  [+ New Template] [+ New Prompt Preset] │
│                    │                                        │
└────────────────────┴────────────────────────────────────────┘
```

#### Interaction Details — Settings
- Settings uses a left-panel section navigation with content on the right (master-detail layout)
- Scoring weight sliders update a live preview of how the current NBA feed would re-rank with the new weights
- Firm-locked settings show a lock icon and tooltip: "This setting is managed by your firm's compliance policy"
- Template editor opens in a full-screen modal with a rich text editor, variable insertion (e.g., `{{client.name}}`, `{{portfolio.ytd_return}}`), and a live preview panel
- Prompt presets support a "Test" button that runs the preset against a sample client and shows the AI output inline
- Custom alert rules use a natural-language rule builder: "When [metric] [operator] [value] for [scope], generate a [priority] NBA"
- Changes auto-save with a "Saved" indicator; critical changes (AI permissions, execution schedule) require explicit "Save & Confirm"
- Delegation Rules section shows a table of all standing rules with enable/disable toggles, edit, and delete actions

---

## 3. Navigation & Information Architecture

### 3.1 Site Map

```
AdvisorAI Desktop
├── Dashboard ("Today")
│   ├── Metrics Bar
│   ├── NBA Feed (filtered, grouped)
│   ├── Schedule
│   └── Activity Stream
│
├── Workflows
│   ├── My Actions
│   ├── In Process
│   ├── Delegated (Human + AI Agent)
│   └── Templates & Automation
│
├── Clients
│   ├── Client List / Search
│   ├── Client Detail
│   │   ├── Overview
│   │   ├── Accounts
│   │   ├── Planning
│   │   ├── Documents
│   │   ├── Activity
│   │   └── Notes
│   ├── Household Detail
│   │   ├── Composition
│   │   ├── Consolidated View
│   │   ├── Goals
│   │   └── Accounts Matrix
│   └── New Client / Household
│
├── Portfolios
│   ├── Portfolio Viewer (by client/HH/account)
│   │   ├── Holdings
│   │   ├── Performance
│   │   ├── Risk
│   │   ├── Attribution
│   │   └── Trading
│   ├── Account Detail
│   │   ├── UMA / Sleeve View
│   │   ├── Positions
│   │   ├── Transactions
│   │   ├── Tax Lots
│   │   └── Documents
│   └── Model Library
│
├── Book of Business
│   ├── Overview & Metrics (incl. practice management KPIs, benchmarking)
│   ├── Client List & Segmentation
│   ├── Pipeline & Prospects
│   ├── Capacity Analysis
│   └── Billing (fee cycle, exceptions, breakpoint opportunities)
│
├── Data Quality Panel (from status bar)
│   ├── Reconciliation Status
│   ├── Open Breaks
│   └── Integration Status
│
├── AI Assistant (global overlay)
│   ├── Chat Interface
│   ├── Document Generation
│   ├── Data Query
│   └── Action Execution
│
└── Settings
    ├── AI & Agentic AI (tone, permissions, schedule)
    ├── NBA Engine (weights, categories, custom alerts)
    ├── Notifications & Alerts (channels, frequency, quiet hours)
    ├── Workflows & Automation (manage, share, execution log)
    ├── Delegation Rules (standing rules, AI + human)
    ├── Template Library (emails, briefs, proposals, presets)
    ├── Appearance (theme, layout)
    └── Integrations (connection status, sync settings)
```

### 3.2 Navigation Patterns

**Primary navigation** (left sidebar) uses icons with labels. Collapsed state shows icons only with tooltips on hover.

**Contextual navigation** (tabs within content area) adapts to the current primary section. Tabs are horizontally scrollable if they exceed the viewport width.

**Breadcrumbs** always show the full path from root to current view, enabling the advisor to jump back to any intermediate level.

**Quick navigation shortcuts:**
- `Ctrl/Cmd + K`: Global search (spotlight-style overlay)
- `Ctrl/Cmd + J`: Toggle AI assistant
- `Ctrl/Cmd + 1–5`: Jump to primary nav sections
- `Ctrl/Cmd + N`: New task / quick capture

---

## 4. Responsive Behavior

| Breakpoint | Layout Adjustments |
|---|---|
| **1920px+** | Full layout with generous spacing. Dashboard: 3-column grid. |
| **1440–1919px** | Default target resolution. Dashboard: 2-column (NBA + Schedule). |
| **1024–1439px** | Sidebar auto-collapses to icon mode. AI panel overlays instead of side-by-side. |
| **Below 1024px** | Not a primary target. Show a "best on desktop" message with limited functionality. |

---

## 5. State Management & Loading

### 5.1 Loading States
- **Initial load:** Full skeleton screen matching the target layout (no spinner)
- **Section refresh:** Section-level skeleton overlay; other sections remain interactive
- **Data fetch:** Inline skeleton rows in tables; shimmer effect on metric cards
- **AI response:** Typing indicator (three animated dots) with elapsed time counter after 5 seconds

### 5.2 Empty States
Each major section has a designed empty state:
- **NBA feed empty:** "You're all caught up. No recommended actions right now." with illustration
- **No accounts:** "No accounts found for this client. [Add Account]"
- **No documents:** "No documents yet. [Upload] or [Generate with AI]"

### 5.3 Error States
- **Integration offline:** Banner at the top of the affected section: "[System name] is currently unavailable. Showing cached data from [timestamp]. [Retry]"
- **Data mismatch:** Subtle warning icon next to affected values with tooltip explaining the discrepancy
- **AI error:** "I wasn't able to complete that request. [Try again] or [Rephrase your question]"

---

## 6. Prototype Technical Architecture

### 6.1 Tech Stack (Recommended for Prototype)

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | React 18+ with TypeScript | Component-based, large ecosystem, enterprise adoption |
| **State Management** | Zustand or Redux Toolkit | Lightweight state management for complex multi-screen data |
| **Routing** | React Router v6 | Standard routing with nested layouts |
| **UI Components** | Shadcn/ui + Radix primitives | Accessible, unstyled primitives with Tailwind customization |
| **Styling** | Tailwind CSS | Utility-first, rapid prototyping, consistent design tokens |
| **Charts** | Recharts + D3 (for custom viz) | Recharts for standard charts; D3 for factor exposure, waterfall |
| **Tables** | TanStack Table | Sorting, filtering, pagination, virtual scrolling |
| **Chat/AI** | Vercel AI SDK or custom | Streaming responses, conversation management |
| **Mock Data** | MSW (Mock Service Worker) | Intercepts API calls with realistic JSON responses; swappable for real APIs |
| **Build** | Vite | Fast development server and build |

### 6.2 Mock Data Architecture

```
/src
  /mocks
    /handlers
      crm.ts           → Client, Household, Activity endpoints
      pms.ts           → Portfolio, Position, Performance endpoints
      oms.ts           → Order, Execution endpoints
      planning.ts      → Plan, Goal, Scenario endpoints
      custodian.ts     → Account, Balance, Transaction endpoints
      compliance.ts    → Alert, Review endpoints
      calendar.ts      → Event, Schedule endpoints
      market.ts        → Quote, Benchmark endpoints
      marketing.ts     → Campaign, Engagement, Drip endpoints
      documents.ts     → DocuSign, Template, Signature endpoints
      billing.ts       → Fee schedule, Billing cycle, Exception endpoints
      reconciliation.ts → Recon status, Break detail, Integration health endpoints
    /data
      clients.json      → 20 realistic client profiles
      households.json   → 12 households with relationships
      accounts.json     → 40+ accounts across custodians
      positions.json    → 500+ position records
      performance.json  → Historical return series
      nbas.json         → 50+ NBA items across categories
      workflows.json    → 30+ in-process items
      documents.json    → Sample document metadata
      billing.json      → Fee schedules, billing cycle status, exceptions
      reconciliation.json → Position/cash/transaction match rates, open breaks
      held-away.json    → Held-away asset estimates by household
    /generators
      faker-finance.ts  → Generates realistic financial data
      time-series.ts    → Generates performance / flow history
```

Mock data is designed to be:
- **Realistic:** Names, account types, values, and holdings reflect actual advisory practice patterns
- **Internally consistent:** Portfolio values equal the sum of positions; household totals equal account sums; drift is calculated from actual vs. model weights
- **Swappable:** Each mock handler matches the contract of the production API, so replacing `crm.ts` with a live Salesforce adapter requires no front-end changes

### 6.3 Folder Structure

```
/src
  /app                → App shell, routing, layout
  /features
    /dashboard        → Dashboard screen and components
    /workflows        → Workflow center
    /clients          → Client and household screens
    /portfolios       → Portfolio, account, UMA screens
    /book             → Book of business, billing, practice metrics
    /ai-assistant     → Chat panel and document generation
    /settings         → Settings screens (AI, NBA, notifications, templates, workflows)
  /components
    /ui               → Shared UI primitives (cards, tables, charts)
    /layout           → Shell, sidebar, breadcrumbs, top bar
    /filters          → Filter components used across features
  /hooks              → Custom React hooks
  /services           → API client layer (talks to mock or real APIs)
  /store              → Global state management
  /types              → TypeScript interfaces and types
  /mocks              → Mock Service Worker setup and data
  /styles             → Tailwind config, global styles, design tokens
```

---

## 7. Accessibility Requirements

- All interactive elements are keyboard-accessible with visible focus indicators
- Color is never the sole indicator of meaning (always paired with icon, text, or pattern)
- ARIA labels on all icon-only buttons and interactive charts
- Minimum contrast ratio of 4.5:1 for text, 3:1 for large text and UI components
- Screen reader announcements for dynamic content updates (live regions for NBA feed, notifications, and AI responses)
- Skip navigation links
- Tables have proper header associations and scope attributes
- Modals and drawers trap focus appropriately

---

## 8. Animation & Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Page transition | Horizontal slide + opacity fade | 200ms | ease-out |
| Drawer open/close | Slide in from right | 250ms | ease-in-out |
| Modal appear | Scale from 0.95 + opacity | 150ms | ease-out |
| Card hover | Subtle lift (translateY -2px, shadow increase) | 100ms | ease-out |
| Skeleton shimmer | Left-to-right gradient sweep | 1.5s | linear (loop) |
| NBA card dismiss | Slide left + fade | 200ms | ease-in |
| Metric value change | Number counter animation | 300ms | ease-out |
| Chart data update | Morphing transition between states | 400ms | ease-in-out |
| AI typing indicator | Three-dot bounce | 600ms | ease-in-out (loop) |

All animations respect `prefers-reduced-motion` and can be disabled globally.

---

## 9. Prototype Demo Scenarios

The prototype should support these end-to-end walkthrough scenarios using mock data:

### Scenario 1: Morning Routine
Advisor logs in, reviews the dashboard, scans NBA feed, clicks "Prep" on the first meeting, AI generates a meeting brief, advisor reviews and saves it.

### Scenario 2: Batch Rebalancing
Advisor sees a grouped NBA for 5 clients drifted >3%, clicks "Review All," sees the proposed trades across accounts, reviews tax impact, approves, and submits to OMS.

### Scenario 3: Client Deep Dive
Advisor searches for "Johnson," opens the household screen, reviews consolidated allocation, drills into the Trust UMA, examines sleeve-level positions, and notes a tax-loss harvesting opportunity.

### Scenario 4: AI-Powered Research
Advisor opens the AI chat, asks "Which of my clients have plans below 75% probability?", reviews the response table, clicks through to one client, then asks the AI to draft a meeting invitation.

### Scenario 5: Workflow Management
Advisor opens Workflows, checks in-process items (account opening, ACAT transfer), delegates a compliance task to their CSA, and creates a custom task from scratch.

### Scenario 6: Agentic AI Delegation & Automation
Advisor opens the Delegated tab, sees that the AI agent has completed meeting prep briefs for two upcoming quarterly reviews (triggered automatically by a standing workflow rule). Advisor clicks "Review & Approve" on the Johnson brief, makes a small edit to a talking point, approves it, and the AI sends the meeting confirmation email. Advisor then navigates to Settings → Workflows, edits the Quarterly Review Prep workflow to add a new step that checks for tax-loss harvesting opportunities, and saves.

### Scenario 7: Held-Away Consolidation
Advisor opens the Johnson Household screen, notices the held-away assets panel showing $285K in a prior employer 401(k) and $150K in an outside brokerage. Clicks "Create Consolidation Proposal," the AI generates a personalized proposal with projected fee savings and tax-transition analysis. Advisor reviews, edits, and queues for delivery.

### Scenario 8: Fee Billing Review
Advisor navigates to Book of Business → Billing tab. Reviews the Q1 billing cycle (currently in Review phase). Notices the Chen Family is flagged as approaching a breakpoint — $200K additional AUM would drop their fee from 75bps to 65bps. Creates a consolidation NBA for the Chen household. Also reviews a proration exception for the newly onboarded Miller account.

### Scenario 9: Data Quality Check
Advisor notices the status bar data quality indicator shows amber (🟡). Clicks to open the Data Quality Panel. Sees 7 transaction breaks with the oldest at 5 days. Drills into the breaks, identifies a corporate action mismatch on the Davis Joint account, and escalates to operations.

### Scenario 10: Settings Customization
Advisor opens Settings → AI & Agentic AI, adjusts their communication tone to "Formal," adds a style guide note about avoiding jargon. Then navigates to NBA Engine, switches the scoring preset from "Balanced" to "Relationship-driven," and creates a custom alert rule: "Alert me when any client hasn't been contacted in 60+ days." Finally, checks the Template Library and edits the "Meeting confirmation" email template to include a new paragraph about the firm's updated privacy policy.

---

## 10. Design Deliverables Checklist

For the clickable prototype, the following screens and states should be implemented:

| Screen | States / Variants | Priority |
|---|---|---|
| Dashboard | Default, filtered NBA, expanded NBA group, empty state | P0 |
| Workflow — My Actions | List view, Kanban view, bulk selection, empty state | P0 |
| Workflow — In Process | Default with multiple process types, granular account opening stages, NIGO tracking | P0 |
| Client Detail | All 6 tabs (Overview w/ per-goal probability, Accounts, Planning, Documents, Activity, Notes) | P0 |
| Household Detail | Composition, consolidated view w/ held-away consolidation, per-goal probability, accounts matrix | P0 |
| Portfolio Viewer | Holdings, Performance, Risk, Attribution tabs | P0 |
| Account Detail | Standard account, UMA with sleeve breakdown | P0 |
| AI Chat Panel | Data query response, document generation, action confirmation | P0 |
| Global Search | Type-ahead with categorized results | P0 |
| Book of Business | Overview metrics (incl. practice KPIs, benchmarking), client list, pipeline, billing tab | P1 |
| Fee Billing View | Billing cycle status, household fee detail, breakpoint opportunities, exceptions | P1 |
| Data Quality Panel | Reconciliation status, open breaks, integration health (from status bar) | P0 |
| Notification Center | Expanded panel with categorized notifications | P1 |
| Workflow — Delegated | Human tasks, AI tasks with progress, Review & Approve flow | P0 |
| Workflow — Templates | Template list, step editor, execution history | P1 |
| Settings — AI & Agentic AI | Tone config, permissions table, execution schedule | P0 |
| Settings — NBA Engine | Weight sliders, category config, custom alert rules | P0 |
| Settings — Notifications | Channel config, quiet hours, per-category rules | P0 |
| Settings — Template Library | Template list, editor with variable insertion | P1 |
| Settings — Workflows | Active workflows, sharing, execution log | P1 |
