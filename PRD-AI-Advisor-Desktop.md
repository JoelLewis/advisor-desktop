# Product Requirements Document: AdvisorAI Desktop

**Version:** 1.0
**Date:** February 25, 2026
**Author:** Product Team
**Status:** Draft

---

## 1. Executive Summary

AdvisorAI Desktop is an AI-native advisor workstation that unifies the fragmented technology stack wealth management professionals navigate daily. By integrating with CRM, Portfolio Management, Order Management, Financial Planning, Compliance, and Custodial systems through a single intelligent interface, the platform eliminates context-switching and surfaces the right information at the right time — whether an advisor manages 50 households independently or operates within a large wirehouse with specialized support teams.

The platform's core differentiator is an AI engine that doesn't just aggregate data but actively reasons across it: identifying which clients need attention, grouping related actions to maximize efficiency, generating compliant documents on demand, and learning the advisor's preferences over time. The goal of this initiative is a functional front-end prototype with demo data, architected so that key API integrations can be connected to demonstrate end-to-end workflows.

---

## 2. Problem Statement

Financial advisors today operate across 7–12 disconnected systems to serve their clients. A single client review meeting may require pulling data from a CRM (Salesforce, Redtail, Wealthbox), a PMS (Orion, Black Diamond, Tamarac), a financial planning tool (eMoney, MoneyGuidePro, RightCapital), a compliance platform, and a custodian portal (Schwab, Fidelity, Pershing). This fragmentation leads to:

- **Time loss:** Advisors spend 40–60% of their day on administrative tasks rather than client-facing activities.
- **Missed opportunities:** Without a unified view, advisors miss rebalancing triggers, life events, compliance deadlines, and cross-sell opportunities.
- **Inconsistent experience:** Clients receive varying levels of preparation and follow-through depending on how well the advisor manually tracks their needs.
- **Compliance risk:** Manual processes for documentation, supervision, and record-keeping increase the likelihood of regulatory gaps.
- **Scaling challenges:** As books grow, the manual overhead of context-switching and task management becomes the primary constraint on practice growth.

---

## 3. Target Users

### 3.1 Primary Persona — Independent / RIA Advisor
- Manages 75–200 households
- Wears multiple hats: portfolio management, financial planning, client service, business development, compliance
- Needs efficiency tools that reduce time per client without sacrificing personalization
- Typically uses Orion or Tamarac for PMS, Redtail or Wealthbox for CRM, eMoney or RightCapital for planning

### 3.2 Primary Persona — Wirehouse / Enterprise Advisor
- Manages 150–500+ households, often with a team (associate advisors, CSAs, paraplanners)
- Operates within firm-mandated technology and compliance frameworks
- Needs supervision visibility, approval workflows, and audit trails
- Typically uses firm-proprietary or Salesforce-based CRM, Advent/APX or BlackRock Aladdin for PMS, firm OMS

### 3.3 Secondary Persona — Client Service Associate (CSA)
- Handles operational tasks: account openings, transfers, maintenance, scheduling
- Needs workflow queues, status tracking, and the ability to act on advisor-delegated tasks

### 3.4 Secondary Persona — Compliance Officer / Branch Manager
- Reviews advisor activity, supervises communications, monitors trading patterns
- Needs dashboards filtered by risk level, exception alerts, and audit-ready reporting

---

## 4. Product Vision and Principles

### 4.1 Vision
One intelligent surface where advisors think about clients, not systems.

### 4.2 Design Principles

1. **Client-centric, not system-centric.** Every screen organizes around people and their goals, not around the source system that holds the data.
2. **AI as copilot, not autopilot.** The AI recommends, drafts, and surfaces — but the advisor decides and acts. Every AI action is transparent and auditable.
3. **Batch efficiency.** Where possible, group related tasks across clients so advisors can process similar actions (e.g., rebalancing, birthday outreach, RMD processing) in bulk.
4. **Progressive disclosure.** Show summary-level information by default; let advisors drill into detail on demand. Minimize cognitive load.
5. **Compliance by design.** Every action captures rationale, timestamps, and lineage. Supervision and record-keeping are built into the workflow, not bolted on.
6. **Works at every level.** The platform operates coherently whether the advisor is looking at a single account, a UMA sleeve, a household, or their entire book of business.

---

## 5. System Integrations

The platform connects to external systems through a normalized integration layer. Each integration category exposes a standardized internal API, allowing the front end to operate independently of the specific vendor behind it.

### 5.1 Integration Architecture

| Category | Internal API | Reference Implementations | Data Flow |
|---|---|---|---|
| **CRM** | Client, Household, Activity, Opportunity | Salesforce, Redtail, Wealthbox, Dynamics 365 | Bidirectional |
| **PMS** | Portfolio, Position, Performance, Model, Drift | Orion, Black Diamond, Tamarac, Addepar, Advent/APX | Read + Trade Instructions |
| **OMS** | Order, Block, Allocation, Execution Status | Orion Trading, iRebal, Advent Moxy, TradeWarrior | Bidirectional |
| **Financial Planning** | Plan, Goal, Scenario, Probability | eMoney, MoneyGuidePro, RightCapital | Read + Plan Updates |
| **Custodian** | Account, Balance, Transaction, Transfer Status | Schwab, Fidelity, Pershing | Read + Instruction Submission |
| **Compliance** | Alert, Review Queue, Supervision Record, Archive | Smarsh, Global Relay, firm-proprietary | Bidirectional |
| **Document Management** | Document, Template, Signature Status | DocuSign, Adobe Sign, firm DMS | Bidirectional |
| **Market Data** | Quote, Index, Benchmark, Economic Indicator | Refinitiv, Bloomberg, IDC | Read (streaming + snapshot) |
| **Calendar / Email** | Event, Message, Contact | Microsoft 365, Google Workspace | Bidirectional |

### 5.2 Prototype Approach
For the prototype, each integration is backed by a mock data service that returns realistic JSON responses. The mock layer is structured identically to the production API contracts so that swapping in a live connector requires no front-end changes. A small number of key integrations (e.g., one CRM, one PMS) may be connected live to demonstrate real data flow.

---

## 6. Feature Specifications

### 6.1 Dashboard — "Today" View

**Priority:** P0 (MVP)

The advisor's default landing screen. Designed to answer: "What should I focus on right now?"

#### 6.1.1 Global Search
**Priority:** P0 (MVP)

Unified search accessible from any screen via `Ctrl/Cmd + K`. Returns categorized results across clients, accounts, securities, documents, tasks, and conversations with type-ahead.

#### 6.1.2 Schedule Panel
- Displays today's calendar with meeting details pulled from Calendar integration
- Each meeting card shows: client/household name, meeting type, key context (portfolio value, last review date, open action items), and a one-click "Prep" button that triggers the AI to assemble a meeting prep brief
- Supports day, week, and agenda views
- Color-coded by meeting type (review, prospect, internal, planning)

#### 6.1.2 Next Best Action (NBA) Feed
The core AI-driven component. The NBA engine analyzes data across all connected systems and generates a prioritized feed of recommended actions.

**NBA Categories:**

| Category | Example Actions | Source Systems |
|---|---|---|
| **Portfolio Management** | Rebalance drift alerts, tax-loss harvesting candidates, RMD processing, model changes, concentrated position alerts | PMS, Market Data |
| **Sales / Business Development** | Follow up on prospect meeting, referral received, client birthday/anniversary, AUM milestone, consolidation opportunity | CRM, Calendar |
| **Financial Planning** | Plan probability below threshold, goal off-track, life event detected (job change, new child, retirement date approaching) | Financial Planning, CRM |
| **Operations** | Account opening in progress, transfer pending, NIGO resolution needed, paperwork expiring, fee billing exceptions | Custodian, CRM |
| **Compliance** | Annual review due, ADV delivery required, trade surveillance flag, communication archive gap, books-and-records archival reminder | Compliance, PMS |
| **Marketing** | Drip campaign response, event invitation follow-up, content engagement signal | CRM, Marketing Automation |

**Advanced Trigger Signals:**
Beyond standard system events, the NBA engine monitors for high-value lifecycle and behavioral signals that often indicate consolidation opportunities or attrition risk:

| Signal Type | Example Triggers | Typical NBA Generated |
|---|---|---|
| **Money-in-Motion** | 401(k) rollover eligible, pension lump-sum window, inheritance, real estate sale proceeds | "Contact re: asset consolidation opportunity" |
| **Generational Transfer** | Trust beneficiary reaching majority, estate settlement in progress, next-gen engagement gap | "Schedule meeting with next-gen family member" |
| **Held-Away Consolidation** | Held-away assets detected above threshold, 401(k) at prior employer, outside brokerage account | "Propose consolidation of held-away assets ($X)" |
| **Fee-Related** | Fee compression trend, breakpoint near-miss, billing exception flagged, competitive fee undercut | "Review fee schedule — client approaching next breakpoint" |
| **Attrition / Competitive Risk** | No meaningful contact in 90+ days, declining engagement score, AUM outflow trend, advisor satisfaction survey dip | "At-risk client — initiate retention outreach" |

**Intelligent Grouping:**
The NBA engine groups related actions across clients when batch processing is more efficient. For example:
- "5 clients have drift exceeding 3% in US Large Cap — Review and rebalance as a group"
- "3 households approaching RMD deadline — Process together"
- "8 clients have birthdays this week — Send personalized messages"

**Filtering and Controls:**
- Category filter (multi-select): Portfolio, Sales, Planning, Operations, Compliance, Marketing
- Priority filter: Critical / High / Medium / Low
- Time horizon: Today / This Week / This Month
- Advisor filter (for teams): My Actions / Team Actions / Delegated to Me
- Household segment filter: by AUM tier, client segment, or custom tag
- Dismiss, snooze (with reminder), delegate, and "mark complete" actions on each NBA card

#### 6.1.3 Key Metrics Bar
A persistent top-of-dashboard summary showing:
- Total AUM and daily change
- Number of open tasks / NBAs
- Meetings remaining today
- Alerts requiring immediate attention (red badge count)
- Net flows (MTD / YTD)

#### 6.1.4 Activity Stream
A chronological feed of recent activity across the practice: completed tasks, client interactions, trade executions, document signings, and system-generated events. Filterable by client, category, and date range.

---

### 6.2 Workflow Center

**Priority:** P0 (MVP)

A task and process management hub that gives the advisor visibility into everything in motion — both their own actions and items being processed elsewhere in the firm.

#### 6.2.1 My Actions Queue
- Personalized task list derived from NBAs, manually created tasks, and system-generated items
- Each task card shows: description, client/household, source system, priority, due date, and estimated time
- Drag-and-drop prioritization
- Bulk action toolbar: assign, reschedule, complete, delegate
- Kanban and list view toggle

#### 6.2.2 In-Process Tracker
Displays the status of items that are being handled by other teams or systems:
- Account openings with granular stage tracking:
  - Application: document collection → KYC/CIP verification → OFAC screening → beneficial ownership → supervisory review → NIGO resolution (if applicable) → submission to custodian → custodian acceptance → funding → account active
  - Each stage shows responsible party, SLA target, time elapsed, and NIGO count
  - Supports multi-custodian pipelines (Schwab, Fidelity, Pershing) with custodian-specific stage variations
- Asset transfers (ACAT stage tracking: initiated → submitted → in transit → settled / partial / rejected)
- Document signature requests (sent → viewed → signed → filed)
- Compliance reviews (submitted → under review → approved / flagged)
- Trade orders (submitted → routed → executed → settled)
- Fee billing cycle (AUM valuation → fee calculation → proration/adjustments → review → invoicing/debit → confirmation) — see Section 6.11

Each item shows: current stage, responsible party, expected completion, and any blockers. Advisors can add notes or escalate directly from this view.

**Data Quality & Reconciliation Health:**
The In-Process Tracker includes a persistent data quality indicator (visible in the status bar) that monitors the health of data feeds across connected systems:
- Position reconciliation status: shows match rate between PMS and custodian (e.g., "Positions: 99.2% matched — 3 breaks")
- Cash reconciliation status: match rate for cash balances across accounts
- Transaction reconciliation status: trade confirms matched to PMS records
- Each indicator is color-coded: green (>99% match), amber (95–99%), red (<95%)
- Clicking the indicator opens a reconciliation detail panel listing unresolved breaks with aging, category (timing, pricing, corporate action, stock split), and resolution pathway

#### 6.2.3 Delegation Panel
Advisors can delegate tasks to human team members or to agentic AI for autonomous execution.

**Human Delegation:**
- Delegate tasks to CSAs, associate advisors, or operations teams
- Delegated items show assignee, status, and completion timestamp
- Standing delegation rules (e.g., "all account maintenance tasks go to my CSA")

**Agentic AI Delegation:**
- Advisors can assign eligible tasks to an AI agent (e.g., Claude Cowork) for autonomous execution
- Eligible task types include: document generation, data gathering and summarization, meeting prep assembly, email drafting, report compilation, compliance documentation, and workflow step preparation
- Each AI-delegated task runs asynchronously and reports back with a completed artifact or a status update requiring advisor review
- AI agent operates within the advisor's configured permissions, templates, and tone preferences (see Section 6.10)
- All AI-executed work is held in a "Pending Review" state until the advisor approves, edits, or rejects
- Audit trail captures: task delegated, AI actions taken, data sources accessed, time to completion, and advisor disposition (approved / edited / rejected)
- Advisors can set standing AI delegation rules (e.g., "auto-generate meeting prep briefs 48 hours before every quarterly review" or "draft birthday emails for all clients and queue for my review each Monday morning")

**Delegation Controls:**
- Each task card shows a "Delegate" button with options: Team Member, AI Agent, or Both (AI prepares, human reviews)
- Standing rules are managed in Settings → Delegation Rules (see Section 6.10)

#### 6.2.4 Workflow Templates & Automation
Pre-built and customizable workflow templates for common multi-step processes. Workflows support both manual steps (assigned to humans) and automated steps (executed by agentic AI).

**Pre-Built Templates:**
- New client onboarding (12–15 steps across CRM, custodian, compliance, planning)
- Annual review cycle (prep → meeting → follow-up → documentation)
- Client offboarding / account closure
- Beneficiary change processing

**Custom Workflow Builder (P1):**
Advisors and team leads can create custom workflows tailored to their practice:
- Drag-and-drop step sequencing with branching logic
- Each step is assigned an owner: specific team member, role-based (e.g., "CSA"), or AI Agent
- Trigger conditions: time-based (e.g., "48 hours before any quarterly review meeting"), event-based (e.g., "when a new account is funded"), or manual
- Step types: human action, AI generation, approval gate, notification, system action (e.g., create CRM activity, submit trade)

**Example Custom Workflow — Quarterly Review Prep (triggered 48 hours before meeting):**
1. AI Agent: Run compliance pre-check — verify annual review status, ADV delivery, IPS currency, and any outstanding regulatory items for the client
2. AI Agent: Pull client performance data and generate performance summary document
3. AI Agent: Analyze portfolio drift and flag rebalancing opportunities with estimated tax impact for each proposed trade
4. AI Agent: Review financial plan and generate updated per-goal probability-of-success snapshot (see Section 6.3.2)
5. AI Agent: Generate proactive recommendations — scan for opportunities including tax-loss harvesting, Roth conversions, charitable giving (QCD/DAF), held-away consolidation, insurance review, and estate plan updates
6. AI Agent: Check for open action items and compile status update
7. AI Agent: Draft meeting agenda with talking points based on steps 1–6
8. AI Agent: Assemble all outputs into a meeting prep brief and notify advisor
9. Advisor: Review prep brief, make edits, finalize agenda (approval gate)
10. AI Agent: Send meeting confirmation email to client with agenda attachment (after advisor approval)

**Workflow Monitoring:**
- Active workflows appear in the In-Process Tracker with step-by-step visibility
- AI-executed steps show a purple indicator and link to the generated artifact
- Advisors receive notifications when AI steps complete or when a workflow reaches an approval gate

---

### 6.3 Client Screen

**Priority:** P0 (MVP)

The 360-degree view of an individual client. Serves as the detailed drill-down from any client reference elsewhere in the platform.

#### 6.3.1 Client Header
- Name, photo, segment/tier, primary advisor, service team
- Key vitals: age, risk profile, total relationship value, client since date
- Quick-action buttons: Call, Email, Schedule Meeting, Create Task, Open in CRM
- Relationship status indicators (last contact, last review, satisfaction score)

#### 6.3.2 Financial Summary
- Net worth snapshot: investable assets, held-away estimates, real estate, liabilities
- Asset allocation vs. target (visual chart)
- Performance summary: YTD, 1Y, 3Y, since inception — with benchmark comparison
- Financial plan probability displayed per-goal rather than as a single aggregate gauge. Each goal (retirement, education, legacy, income, etc.) shows its own Monte Carlo probability-of-success, status indicator (on track / needs attention / off track), and the primary driver of any shortfall. A composite "overall plan health" indicator is derived from the weighted average of individual goal probabilities, but the per-goal detail is always visible. This prevents a single strong goal from masking a failing one.

#### 6.3.3 Accounts List
- All accounts for this client across custodians
- Each row: account name, type (IRA, Roth, Joint, Trust, etc.), custodian, value, model assignment
- Click-through to Account Detail screen
- UMA sleeve visibility where applicable (see Section 6.7)

#### 6.3.4 Activity & Interaction Timeline
- Chronological log of all touchpoints: meetings, calls, emails, document exchanges, trades, service requests
- Entries sourced from CRM, Calendar, Email, Compliance Archive
- Filterable by type, date range, and team member

#### 6.3.5 Open Items & NBAs
- Client-specific subset of the NBA feed and task queue
- Shows all pending actions related to this client

#### 6.3.6 Documents
- All documents associated with the client: signed agreements, statements, plans, correspondence
- Upload, generate, and e-sign capabilities
- Version history and audit trail

#### 6.3.7 Notes & AI Summary
- Free-form notes with tagging
- AI-generated client summary: a one-paragraph natural language synopsis of the client's current situation, recent activity, and upcoming needs — refreshed daily

---

### 6.4 Household Screen

**Priority:** P0 (MVP)

Aggregates data across all members of a household to support holistic planning and management.

#### 6.4.1 Household Composition
- Visual family tree / relationship diagram
- Each member card: name, role (primary, spouse, dependent, trust beneficiary), individual vs. joint accounts
- Ability to add/remove household members (synced to CRM)

#### 6.4.2 Consolidated Financial View
- Combined net worth, asset allocation, and performance across all household members
- Household-level vs. individual-level toggle
- Tax lot optimization view: shows tax-loss harvesting and gain management opportunities across the household's taxable accounts
- Held-away asset consolidation panel: prominently displays known held-away assets (401(k) at prior employer, outside brokerage, bank accounts, etc.) with estimated values, last updated date, and a "Create Consolidation Proposal" action that triggers the AI to generate a personalized consolidation pitch with projected fee savings, simplification benefits, and tax-transition analysis

#### 6.4.3 Household Goals & Plans
- Aggregated financial planning goals (retirement, education, legacy, etc.)
- Plan probability at the household level
- Cross-member dependencies (e.g., spousal Social Security optimization, estate plan coordination)

#### 6.4.4 Household Accounts Matrix
- Grid view: rows = accounts, columns = key attributes (owner, type, custodian, value, model, drift status)
- Supports sorting, filtering, and inline actions (rebalance, trade, view detail)

---

### 6.5 Book of Business Screen

**Priority:** P1

The practice-level management view for advisors and teams.

#### 6.5.1 Book Overview Metrics
- Total AUM, number of households, number of accounts
- Revenue (actual and projected), effective fee rate with trend over time (to surface fee compression)
- Net flows: new assets, withdrawals, market movement — with trend charts
- AUM decomposition waterfall: breaks AUM change into components (market appreciation, new client assets, existing client inflows, withdrawals, client attrition) over configurable periods
- Client retention rate, organic growth rate (new assets from existing clients / beginning AUM, excluding market)
- Revenue concentration analysis: percentage of revenue from top 10/25 clients, Herfindahl index
- Attrition analysis by reason: competitive loss, life event, service dissatisfaction, fee sensitivity, natural (estate/death) — with trend
- Industry benchmarking indicators: compare key practice metrics (organic growth, effective fee rate, clients per advisor, revenue per relationship) against anonymized peer benchmarks (e.g., Schwab RIA Benchmarking, FA Insight categories) where data is available

#### 6.5.2 Client Segmentation
- Tiered view by AUM, revenue, service model, risk profile, or custom segments
- Segment-level performance and flow summaries
- Drag-and-drop re-segmentation

#### 6.5.3 Pipeline & Prospects
- Integration with CRM opportunity pipeline
- Prospect cards with: source, estimated AUM, stage, probability, next action
- Conversion funnel visualization

#### 6.5.4 Capacity Analysis
- Service capacity modeling: based on current client count, meeting frequency, and service model commitments, how much capacity does the advisor/team have?
- Alerts when capacity thresholds are approached

---

### 6.6 Portfolio Screen

**Priority:** P0 (MVP)

Detailed portfolio analytics accessible from client, household, or account context.

#### 6.6.1 Holdings & Positions
- Full position-level detail: security, quantity, market value, cost basis, unrealized gain/loss, weight
- Grouping by: asset class, sector, geography, tax lot, sleeve (for UMA)
- Search and filter within holdings

#### 6.6.2 Performance
- Time-weighted and money-weighted returns
- Period selector: MTD, QTD, YTD, 1Y, 3Y, 5Y, 10Y, inception
- Benchmark comparison (configurable benchmarks per account/model)
- Performance attribution: allocation effect, selection effect, interaction
- Charted equity curve with benchmark overlay

#### 6.6.3 Risk Analytics
- Portfolio risk metrics: standard deviation, Sharpe ratio, Sortino ratio, max drawdown, beta
- Factor exposure analysis (market, size, value, momentum, quality)
- Stress test scenarios (2008 crisis, 2020 COVID, rising rates, etc.)
- Risk contribution by position

#### 6.6.4 Model Compliance & Drift
- Target model vs. current allocation comparison (bar chart)
- Drift percentage by asset class with tolerance bands
- One-click "generate rebalance trades" that flows to OMS
- Drift history over time

#### 6.6.5 Trading
- Proposed trade review: before submitting to OMS, the advisor sees the impact on allocation, tax consequences, and compliance pre-checks
- Trade blotter: recent and pending orders with status
- Block trade view for batch processing across accounts

---

### 6.7 Account Screen

**Priority:** P0 (MVP)

Individual account detail accessible from client or household context.

#### 6.7.1 Account Header
- Account number, type, registration, custodian, funding date
- Current value, cost basis, unrealized gain/loss
- Model assignment, rebalancing schedule
- Account status (active, restricted, closing, etc.)

#### 6.7.2 UMA / Sleeve View
For Unified Managed Accounts, the account screen supports a sleeve-level breakdown:
- Each sleeve shows: strategy/model, manager (if sub-advised), allocation target vs. actual, drift, performance
- Sleeve-level rebalancing controls
- Cash management across sleeves (centralized cash sleeve vs. distributed)
- Overlay management visibility: tax management, ESG screens, concentrated stock hedging

#### 6.7.3 Transaction History
- Full transaction log: trades, dividends, interest, contributions, withdrawals, fees
- Filterable by type, date range, security
- Exportable to CSV/PDF

#### 6.7.4 Tax Lot Detail
- Lot-level view with acquisition date, cost basis method, holding period, gain/loss
- Tax-loss harvesting candidate highlighting
- Wash sale monitoring

#### 6.7.5 Account Documents
- Statements, confirms, tax forms (1099s), agreements
- Auto-filed from custodian feeds

---

### 6.8 AI Assistant — Multimodal Chat

**Priority:** P0 (MVP)

A persistent chat interface available from any screen in the application. The AI assistant can query data across all connected systems, reason about the advisor's context, and produce structured outputs.

#### 6.8.1 Conversational Interface
- Text input with support for natural language queries
- Context-aware: the assistant knows which screen the advisor is on and which client/account is in focus
- Conversation history with searchable archive
- Voice input support (P2)

#### 6.8.2 Data Retrieval Capabilities
The assistant can answer questions that span multiple systems:
- "What's the Smith household's total exposure to tech stocks across all accounts?"
- "Which of my clients have plans with less than 70% probability of success?"
- "Show me all accounts with drift greater than 5% that haven't been rebalanced in 90 days"
- "What's my AUM trend over the last 12 months broken down by net flows vs. market movement?"

Responses include data tables, charts, and citations back to source systems.

#### 6.8.3 Document Generation
The assistant can produce formatted documents on demand:

| Document Type | Description | Priority |
|---|---|---|
| **Meeting prep brief** | Client summary, performance snapshot, open items, talking points, agenda | P0 |
| **Investment proposal** | Proposed allocation, historical performance, risk analysis, fee illustration | P0 |
| **Portfolio review report** | Performance, attribution, commentary, outlook — client-ready formatting | P0 |
| **Financial plan summary** | Goal progress, scenario analysis, recommendations — plain-language format | P0 |
| **Email draft** | Context-aware follow-up emails, outreach, birthday messages, meeting confirmations | P0 |
| **Trade rationale memo** | Compliance-ready documentation of why a trade was placed | P1 |
| **Compliance case note** | Structured documentation for supervision records | P1 |
| **PowerPoint presentation** | Client review deck, prospect pitch, quarterly business review | P1 |
| **One-pager** | Single-page client summary or strategy overview for meetings | P1 |
| **Onboarding welcome packet** | Customized welcome letter, service agreement, fee schedule | P2 |

Documents are generated in the advisor's preferred style/template and can be edited before delivery.

#### 6.8.4 Action Execution
The assistant can initiate actions with advisor confirmation:
- "Schedule a review meeting with the Johnson household for next week"
- "Generate rebalance trades for all accounts drifted more than 3%"
- "Create a task to follow up with prospect Jane Miller in 5 business days"
- "Draft and queue birthday emails for this week's clients"

All actions require explicit advisor approval before execution.

#### 6.8.5 Multimodal Inputs (P2)
- Upload documents (statements, tax returns, estate plans) for the AI to analyze and extract data
- Screenshot / screen region capture for the AI to interpret and act on
- Voice dictation for notes and instructions

---

### 6.9 Navigation & Global Features

**Priority:** P0 (MVP)

#### 6.9.1 Global Search
- Unified search across clients, accounts, securities, documents, tasks, and conversations
- Type-ahead with categorized results
- Recent searches and saved searches

#### 6.9.2 Navigation Structure
- **Primary nav (left sidebar):** Dashboard, Workflows, Clients, Portfolios, Book of Business, AI Assistant, Settings
- **Secondary nav (contextual):** Changes based on the active primary section (e.g., within Clients: Overview, Accounts, Planning, Documents, Activity)
- **Breadcrumb trail:** Always visible, showing the current context path (e.g., Clients → Johnson Household → Robert Johnson → Roth IRA)

#### 6.9.3 Notifications Center
- Bell icon with badge count
- Categorized notifications: system alerts, NBA items, workflow updates, mentions from team
- Mark read, dismiss, or act directly from notification panel

#### 6.9.4 User Preferences
- Theme (light/dark)
- Default landing page
- Document templates and branding

---

### 6.10 Settings & Configuration

**Priority:** P0 (core settings), P1 (advanced customization)

A centralized settings area where advisors and team leads manage AI behavior, automation rules, NBA tuning, and notification preferences.

#### 6.10.1 AI & Agentic AI Settings (P0)

**Prompt & Tone Configuration:**
- **Communication style:** Advisor sets their preferred tone for AI-generated content (formal / conversational / somewhere in between) with a free-text style guide field for nuance (e.g., "I prefer short, direct emails. Never use exclamation points. Always reference the client's goals by name.")
- **Template library:** Advisors manage a library of document templates the AI uses as starting points for generation. Each template type (email, meeting brief, proposal, review report, PowerPoint) can have multiple variants (e.g., "Prospect follow-up — warm" vs. "Prospect follow-up — cold")
- **Signature & branding:** Default email signature, firm logo, color scheme, and disclaimer text applied to all AI-generated documents
- **Prompt presets:** Saved prompt shortcuts for common AI requests (e.g., "Quick portfolio summary" expands to a detailed instruction the advisor has refined over time)

**Agentic AI Permissions:**
- **Allowed action types:** Toggle which categories of work the AI agent can perform autonomously (document generation ✓, email drafting ✓, trade suggestion ✗, CRM updates ✗). Defaults are conservative.
- **Approval requirements:** Per-action-type setting — "Auto-approve," "Queue for review," or "Notify and hold." Firm-level policies may override advisor preferences (e.g., firm mandates "Queue for review" on all compliance documents).
- **Data access scope:** Which connected systems the AI agent can read from when performing autonomous work. Advisors can restrict AI from accessing certain client segments or data types.
- **Execution schedule:** Time windows when the AI agent is allowed to execute tasks (e.g., business hours only, or 6 AM – 10 PM).
- **Standing delegation rules:** The rules created in the Delegation Panel (Section 6.2.3) are managed here. Each rule shows: trigger condition, task type, AI action, and approval requirement.

**AI Behavior Tuning:**
- **Verbosity level:** Controls how detailed AI responses are in the chat (concise / balanced / detailed)
- **Proactive suggestions:** Toggle whether the AI proactively suggests actions or only responds when asked
- **Learning preferences:** Opt in/out of the AI learning from the advisor's behavior (NBA responses, document edits, dismissed suggestions)

#### 6.10.2 NBA Engine Settings (P0)

**Scoring Weight Customization:**
- Visual sliders for each NBA scoring factor (Urgency, Impact, Efficiency, Relationship, Confidence — see Section 7.1)
- Presets: "Balanced" (default), "Revenue-focused," "Compliance-first," "Relationship-driven"
- Custom weight profiles that can be saved and switched between

**Category & Alert Configuration:**
- Per-category toggle: enable/disable NBA generation for each category (Portfolio, Sales, Planning, Operations, Compliance, Marketing)
- Per-category priority floor: minimum priority level before an NBA surfaces (e.g., "Only show me Compliance NBAs if they're High or Critical")
- Custom alert rules: advisor-defined triggers that generate NBAs (e.g., "Alert me when any client's plan probability drops below 75%" or "Flag any account with cash above $50K for 30+ days")

**Grouping Preferences:**
- Minimum group size before batching (default: 3)
- Preferred grouping dimensions (by action type, by model, by client segment)
- Maximum group size (to prevent unwieldy batches)

#### 6.10.3 Notifications & Alerts Settings (P0)

**Channel Configuration:**
- In-app notification center: always on
- Email digest: daily summary, weekly summary, or off
- Push notifications (future mobile): per-category toggle
- Desktop notifications: toggle for critical alerts

**Frequency & Quiet Hours:**
- Notification batching interval (real-time, hourly, twice daily)
- Quiet hours: suppress non-critical notifications outside defined windows
- "Do Not Disturb" mode with exception for critical compliance alerts

**Per-Category Notification Rules:**
| Category | Default | Configurable Options |
|---|---|---|
| Compliance alerts | Real-time, in-app + email | Cannot be disabled (firm policy) |
| Trade execution status | Real-time, in-app | In-app only, or + email |
| Workflow stage changes | Real-time, in-app | Batched, or per-stage selection |
| NBA new items | Batched (morning) | Real-time, batched, or daily digest |
| AI task completion | Real-time, in-app | In-app, email, or silent (check manually) |
| Team mentions | Real-time, in-app | In-app + email, or batched |
| Client activity | Batched (daily) | Real-time for specific clients, or daily |

#### 6.10.4 Workflow Automation Settings (P1)

**Custom Workflow Management:**
- List of all active, paused, and draft workflows
- Per-workflow controls: enable/disable, edit, duplicate, delete, view execution history
- Workflow sharing: share workflows with team members or publish to firm-wide library
- Execution log: every workflow run shows step-by-step execution detail, timestamps, AI artifacts produced, and advisor actions taken

**Team & Role Configuration:**
- Define team members and their roles (advisor, associate advisor, CSA, paraplanner)
- Set default task routing by role
- Capacity limits per team member (max concurrent delegated tasks)

#### 6.10.5 Firm-Level Overrides (P2)
For enterprise deployments, firm administrators can set policies that override individual advisor settings:
- Mandatory compliance notification rules
- AI permission ceilings (e.g., AI can never auto-approve trade suggestions, regardless of advisor preference)
- Required templates and disclaimers on all client-facing documents
- Approved prompt libraries and prohibited prompt patterns
- Data access restrictions by advisor tier or client segment

---

### 6.11 Fee Billing & Revenue Operations

**Priority:** P1

The fee billing workflow provides visibility into the advisory fee lifecycle, from AUM valuation through client billing. This is primarily a read-and-monitor interface in the prototype, displaying billing cycle status and flagging exceptions.

#### 6.11.1 Billing Dashboard
- Current billing cycle status: shows where in the quarterly cycle the firm currently stands (valuation → calculation → review → collection)
- Fee summary: total fees billed this period, comparison to prior period, effective fee rate trend
- Household-level fee detail: each household's fee amount, AUM basis, fee schedule (tiered, flat, breakpoint), billing method (direct debit vs. invoice)
- Proration tracking: new accounts, closed accounts, and mid-period changes that require prorated fee adjustments

#### 6.11.2 Fee Exception Management
- Exceptions queue: accounts or households where the calculated fee deviates from expected (e.g., missing AUM data, fee schedule mismatch, breakpoint near-miss, client-specific override expired)
- Breakpoint analysis: identifies clients approaching the next fee tier and calculates the additional AUM needed to reach it — surfaces as an NBA for consolidation outreach
- Fee waiver and discount tracking: lists all active fee modifications with expiration dates and approval history

#### 6.11.3 Revenue Forecasting
- Forward-looking revenue estimate based on current AUM, fee schedules, and pipeline
- Scenario modeling: impact of fee compression, client attrition, or new asset inflows on projected revenue

---

## 7. AI Engine Specifications

### 7.1 NBA Scoring Model
Each potential next best action is scored using a weighted model:

| Factor | Weight | Description |
|---|---|---|
| **Urgency** | 30% | Time-sensitivity of the action (regulatory deadline, market event, client request) |
| **Impact** | 25% | Estimated value to the client or practice (AUM retention, revenue, compliance risk) |
| **Efficiency** | 20% | Can this action be batched with similar actions for other clients? |
| **Relationship** | 15% | How long since the last meaningful contact with this client? |
| **Confidence** | 10% | How certain is the AI that this action is appropriate given the data? |

Advisors can adjust weights through preferences. The model learns from advisor behavior (which NBAs are acted on, dismissed, or snoozed).

### 7.2 Grouping Logic
The AI identifies actions that share common attributes (same security, same model, same action type, same compliance requirement) and clusters them into batch-actionable groups. Grouping respects household boundaries — the advisor sees "5 clients need X" not "5 accounts across 3 households and 2 individual clients need X" unless they drill in.

### 7.3 Context Window
The AI assistant maintains a per-advisor context that includes:
- Current screen and focused entity (client, account, portfolio)
- Recent conversation history (last 50 turns)
- Advisor preferences, frequently used templates, and communication style
- Active task list and workflow state

### 7.4 Guardrails
- All AI-generated content is clearly labeled as AI-generated
- Documents include a "Review before sending" interstitial
- Trade suggestions require explicit confirmation and pass pre-trade compliance checks
- The AI will not execute actions that violate compliance rules or firm policies
- All AI interactions are logged for supervision and audit

### 7.5 Fiduciary Pre-Flight Checks
Before the AI generates any investment-related recommendation, rebalance suggestion, or trade proposal, it performs an automated pre-flight check against the client's Investment Policy Statement (IPS) and applicable fiduciary constraints:
- Verifies proposed allocation stays within IPS asset class ranges
- Checks concentration limits (single security, sector, issuer)
- Validates that the recommendation is consistent with the client's stated risk tolerance and time horizon
- Confirms no restricted securities or ESG exclusions are violated
- Flags if the client's IPS is expired or missing (generates an NBA to update it)
- Any constraint violation blocks the recommendation from surfacing and instead generates a warning explaining which IPS constraint would be breached, linking to SEC 2019 Fiduciary Interpretation guidance where relevant

### 7.6 Books-and-Records Compliance for AI Content
All AI-generated content that constitutes a communication, recommendation, or advisory record is subject to books-and-records archival requirements (SEC Rule 204-2 for investment advisers, FINRA Rules 17a-3/17a-4 for broker-dealers):
- **Automatic archival:** Every AI-generated document (meeting brief, email draft, proposal, trade rationale, compliance note) is automatically archived with: timestamp, advisor who requested it, client context, AI model version, data sources accessed, and advisor disposition (approved as-is / edited / rejected)
- **Edit tracking:** If an advisor edits an AI-generated document before sending, both the original AI output and the advisor's final version are archived
- **Retention policy:** Archives follow the firm's retention schedule (typically 5 years for investment adviser records, 6 years for broker-dealer). Retention periods are configurable at the firm level.
- **WORM compliance:** Archives are written to immutable (Write Once, Read Many) storage — the advisor cannot delete or alter archived records
- **Supervision integration:** AI-generated communications flagged for supervision review are routed to the compliance queue with the full generation context attached
- **Search and retrieval:** Archived AI content is searchable by client, date, document type, advisor, and keyword — supporting examination readiness

---

## 8. Priority Classification

### P0 — Must Have (Prototype Core)
- Dashboard with schedule, NBA feed (with filtering, grouping, and advanced trigger signals), metrics bar
- Workflow center with task queue, in-process tracker (with granular account opening stages), and delegation panel (human + AI agent)
- Client screen (360-degree view with per-goal plan probability)
- Household screen with consolidated view and held-away consolidation panel
- Account screen with UMA/sleeve support
- Portfolio screen with holdings, performance, drift, and trading
- AI assistant with data retrieval, document generation (meeting prep briefs, proposals, emails), fiduciary pre-flight checks, and action initiation
- AI books-and-records archival (automatic archival, edit tracking, WORM compliance)
- Global search and navigation
- Data quality / reconciliation health indicator in status bar
- Settings: AI tone/template configuration, NBA scoring weights, notification preferences
- Mock data layer for all integration points

### P1 — Should Have (Enhanced Prototype)
- Book of business screen with segmentation, pipeline, practice management metrics (organic growth, fee compression, attrition analysis, revenue concentration, benchmarking)
- Fee billing dashboard with exception management, breakpoint analysis, and revenue forecasting
- Custom workflow builder with agentic AI steps, trigger-based automation, compliance pre-check steps, and proactive recommendation generation
- Advanced portfolio analytics (attribution, factor exposure, stress testing)
- AI document generation: compliance memos, trade rationale, PowerPoint decks, one-pagers
- Notification center
- Team / multi-advisor support with role-based task routing
- Bulk action processing from NBA groupings
- Workflow automation settings and execution logging

### P2 — Nice to Have (Future Enhancement)
- Voice input for AI assistant
- Multimodal document upload and analysis
- Capacity analysis and practice management
- Custom workflow builder
- AI learning from advisor behavior (personalized NBA weighting)
- Mobile companion app
- Real-time collaboration (advisor + CSA working on same client simultaneously)
- Client portal integration (what the client sees)

---

## 9. Non-Functional Requirements

### 9.1 Performance
- Dashboard load time: under 2 seconds with cached data, under 5 seconds with cold integration calls
- AI assistant response time: under 3 seconds for data queries, under 10 seconds for document generation
- Search results: under 500ms for type-ahead, under 2 seconds for full results

### 9.2 Security & Compliance
- Role-based access control (RBAC) with firm-configurable permission sets
- All data in transit encrypted (TLS 1.3); all data at rest encrypted (AES-256)
- SOC 2 Type II compliance target
- Full audit trail on every user action, AI interaction, and data access
- Session timeout and MFA support
- FINRA books and records compliance for all archived communications

### 9.3 Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support across all screens
- Screen reader compatible

### 9.4 Browser & Device Support
- Primary: Chrome, Edge (latest 2 versions), desktop resolution 1440px+
- Secondary: Safari, Firefox
- Responsive down to 1024px (tablet landscape)

---

## 10. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Advisor time on administrative tasks | 30% reduction | Time-motion study, pre/post |
| NBA action rate | 60%+ of surfaced NBAs acted on within 48 hours | Platform analytics |
| Client review prep time | 75% reduction (from ~45 min to ~10 min) | Self-reported + platform usage |
| System context switches per day | 50% reduction | Login analytics across systems |
| Document generation time | 90% reduction for standard documents | Platform analytics |
| Advisor satisfaction (NPS) | 50+ | Quarterly survey |

---

## 11. Open Questions & Risks

| # | Question / Risk | Status | Owner |
|---|---|---|---|
| 1 | Latency of live PMS integrations — will real-time drift monitoring be feasible? | Open | Engineering |
| 2 | Compliance review of AI-generated documents — what supervision workflow is required before client delivery? | Open | Compliance |
| 3 | Data residency requirements for multi-custodian data aggregation | Open | Legal / Infosec |
| 4 | LLM provider selection and on-premise vs. cloud deployment for regulated data | Open | Engineering / Compliance |
| 5 | Firm-level customization: how much can each firm configure the NBA model, templates, and workflows? | Open | Product |
| 6 | Cost model for AI inference at scale (per-advisor, per-query economics) | Open | Finance / Engineering |

---

## 12. Glossary

| Term | Definition |
|---|---|
| **NBA** | Next Best Action — an AI-recommended action for the advisor |
| **UMA** | Unified Managed Account — a single account with multiple investment sleeves/strategies |
| **PMS** | Portfolio Management System |
| **OMS** | Order Management System |
| **CRM** | Customer Relationship Management |
| **ACAT** | Automated Customer Account Transfer |
| **NIGO** | Not In Good Order — paperwork that has errors or missing information |
| **RMD** | Required Minimum Distribution |
| **CSA** | Client Service Associate |
| **IPS** | Investment Policy Statement |
| **TWR / MWR** | Time-Weighted Return / Money-Weighted Return |
| **WORM** | Write Once, Read Many — immutable storage for regulatory compliance |
| **CIP / KYC** | Customer Identification Program / Know Your Customer |
| **QCD** | Qualified Charitable Distribution |
| **DAF** | Donor-Advised Fund |
| **OFAC** | Office of Foreign Assets Control — sanctions screening |
