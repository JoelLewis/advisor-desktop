import type { NBA } from '@/types/nba'

export const nbas: NBA[] = [
  // ── Rebalancing (batch group — 7 clients over 3% drift) ──
  {
    id: 'nba-001', title: 'Batch Rebalance — 7 portfolios exceeding drift threshold',
    description: 'Seven client portfolios have drifted beyond the 3% threshold due to recent equity rally. Batch rebalancing can save ~40 minutes vs individual trades.',
    category: 'rebalancing', priority: 'high',
    scoring: { urgency: 72, impact: 80, efficiency: 90, relationship: 50, confidence: 88, composite: 77 },
    clients: [
      { id: 'cli-001', name: 'Robert Johnson' }, { id: 'cli-003', name: 'Margaret Chen' },
      { id: 'cli-006', name: 'Michael Martinez' }, { id: 'cli-008', name: 'James Thompson' },
      { id: 'cli-009', name: 'Richard Anderson' }, { id: 'cli-011', name: 'Raj Patel' },
      { id: 'cli-017', name: 'William Foster' },
    ],
    groupId: 'grp-001',
    trigger: { source: 'pms', condition: 'drift_exceeded', value: '3.2%-5.8%', detectedAt: '2026-02-24T08:00:00Z' },
    suggestedAction: 'Generate batch rebalance trades with tax-loss harvesting overlay',
    estimatedImpact: 45_000, createdAt: '2026-02-24T08:15:00Z', expiresAt: '2026-03-01T23:59:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/rebalance' },
  },
  // ── Tax Management ──
  {
    id: 'nba-002', title: 'Tax-loss harvesting opportunity — INTC position',
    // D22 · tax-loss-harvesting — the $78.6K + $52.4K + $93.3K = $224K figure was pre-Task-18
    // (acc-002's INTC position was 12,000 shares; a recorded 5,000-share sale left 7,000). Current
    // losses per the fixtures: acc-002 -45,850, acc-011 -52,400, acc-015 -93,250, total -191,500.
    // The total also conflates the harvestable loss with the tax benefit; the appended sentence
    // separates them and states the benefit at LONG_TERM_RATE (23.8%) applied to the exact total,
    // not to rounded per-account components (45.9 + 52.4 + 93.3 sums to 191.6, not 191.5).
    description: 'Intel (INTC) is down 18.7% from cost basis across 3 client accounts ($45,850 + $52,400 + $93,250 = $191,500 harvestable losses). Harvesting could offset realized gains from Q4. Estimated tax benefit at long-term rates is about $45,600; the $191,500 is the harvestable loss, not the benefit.',
    category: 'tax_management', priority: 'high',
    scoring: { urgency: 85, impact: 75, efficiency: 70, relationship: 40, confidence: 92, composite: 76 },
    clients: [
      { id: 'cli-001', name: 'Robert Johnson' }, { id: 'cli-004', name: 'David Williams' },
      { id: 'cli-006', name: 'Michael Martinez' },
    ],
    groupId: 'grp-002',
    trigger: { source: 'pms', condition: 'unrealized_loss_threshold', value: '-18.7%', detectedAt: '2026-02-24T09:30:00Z' },
    suggestedAction: 'Sell INTC, replace with semiconductor ETF (SMH) to maintain sector exposure',
    // Review round 1, Critical · this was 224_000 — the harvestable loss, not the benefit — the
    // same "impact = the raw dollar figure, not what the client actually gets" mistake nba-014's
    // Reg BI fix exists to correct, now rendered on-screen by NBACard's impact figure. The value
    // the client actually realises is the tax benefit at long-term rates: 45,850 + 52,400 + 93,250
    // = 191,500 × LONG_TERM_RATE (0.238) = 45,577 exactly (nba-facts.test.ts asserts this figure
    // is exactly the sum of estimatedTaxBenefit() over the three INTC lots, not transcribed).
    estimatedImpact: 45_577, createdAt: '2026-02-24T09:45:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/accounts/acc-002/tax' },
  },
  {
    id: 'nba-003', title: 'Wash sale risk — Margaret Chen sold NVDA on Feb 10',
    description: 'Margaret Chen sold NVDA at a loss on Feb 10. The 30-day wash sale window closes Mar 12. Her IPS caps any single issuer at 10% — do not repurchase until window expires.',
    category: 'tax_management', priority: 'critical',
    scoring: { urgency: 95, impact: 60, efficiency: 30, relationship: 45, confidence: 98, composite: 72 },
    clients: [{ id: 'cli-003', name: 'Margaret Chen' }],
    trigger: { source: 'compliance', condition: 'wash_sale_window', value: 'NVDA — closes Mar 12', detectedAt: '2026-02-24T06:00:00Z' },
    suggestedAction: 'Block NVDA purchases until Mar 13; use QQQ as temporary substitute',
    estimatedImpact: 8_500, createdAt: '2026-02-24T06:15:00Z', expiresAt: '2026-03-12T23:59:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/accounts/acc-007/tax' },
    contextRelevance: 'portfolio',
  },
  // ── Planning ──
  {
    id: 'nba-004', title: 'RMD deadline approaching — James Thompson',
    description: "James Thompson turns 73 this year. His first Required Minimum Distribution of ~$83,000 (based on $2.2M IRA balance ÷ 26.5 Uniform Lifetime Table factor) must be taken by April 1, 2027, but taking it in 2026 avoids a double-RMD year.",
    category: 'planning', priority: 'high',
    scoring: { urgency: 80, impact: 70, efficiency: 65, relationship: 60, confidence: 95, composite: 76 },
    clients: [{ id: 'cli-008', name: 'James Thompson' }],
    trigger: { source: 'planning', condition: 'rmd_age_threshold', value: 'age 73 in 2026', detectedAt: '2026-01-15T08:00:00Z' },
    suggestedAction: 'Schedule RMD planning meeting; model tax-optimal distribution strategy',
    estimatedImpact: 83_000, createdAt: '2026-01-15T08:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-008', openAI: true, aiMessage: 'Prepare RMD planning analysis for James Thompson — model tax-optimal distribution strategy for 2026' },
  },
  {
    id: 'nba-005', title: 'Goal probability dropped — Patel education fund',
    description: "The Patel 529 education fund probability dropped from 88% to 74% due to market drawdown. An additional $2,000/month contribution would restore it to 85%.",
    category: 'planning', priority: 'medium',
    scoring: { urgency: 55, impact: 65, efficiency: 50, relationship: 70, confidence: 82, composite: 62 },
    clients: [{ id: 'cli-011', name: 'Raj Patel' }, { id: 'cli-012', name: 'Priya Patel' }],
    trigger: { source: 'planning', condition: 'goal_probability_drop', value: '88% → 74%', detectedAt: '2026-02-20T10:00:00Z' },
    suggestedAction: 'Present contribution increase scenario; review asset allocation',
    estimatedImpact: 48_000, createdAt: '2026-02-20T10:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-011', openAI: true, aiMessage: 'Analyze Patel 529 education fund — probability dropped from 88% to 74%. Show contribution increase scenarios' },
  },
  {
    id: 'nba-006', title: 'Retirement plan review — Linda Garcia',
    description: 'Linda Garcia is 75 and her portfolio is 60% equities, which exceeds the risk tolerance guidelines for her age and conservative profile. Consider shifting to 40/60.',
    category: 'planning', priority: 'medium',
    scoring: { urgency: 60, impact: 55, efficiency: 45, relationship: 50, confidence: 78, composite: 56 },
    clients: [{ id: 'cli-016', name: 'Linda Garcia' }],
    trigger: { source: 'planning', condition: 'allocation_age_mismatch', value: '60% equity at age 75', detectedAt: '2026-02-22T08:00:00Z' },
    suggestedAction: 'Schedule review meeting; present de-risking glide path',
    estimatedImpact: 15_000, createdAt: '2026-02-22T08:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-016', openAI: true, aiMessage: 'Review retirement plan for Linda Garcia — portfolio is 60% equities at age 75 with conservative profile. Present de-risking glide path' },
  },
  // ── Risk ──
  {
    // D9 · this previously named an "AAPL (founder shares)" position for Margaret Chen — Apple has
    // no founder-shares class, acc-007 (her account) holds no AAPL, and no fixture holds AAPL
    // "founder shares" at all. Re-pointed at the real concentration in the dataset: acc-011
    // (David Williams) holds NVDA at 13.9% (pos-070, weight 0.139) against the 10% IPS limit.
    id: 'nba-007', title: 'Concentration risk — David Williams NVDA >13%',
    description: 'David Williams holds NVDA at 13.9% of his individual account (acc-011), against a 10% single-issuer IPS limit. A phased reduction paired with harvesting in correlated positions would bring it inside the limit while limiting the realised gain.',
    category: 'risk', priority: 'high',
    scoring: { urgency: 70, impact: 85, efficiency: 40, relationship: 55, confidence: 95, composite: 72 },
    clients: [{ id: 'cli-004', name: 'David Williams' }],
    trigger: { source: 'compliance', condition: 'concentration_exceeded', value: 'NVDA 13.9% vs 10% limit', detectedAt: '2026-02-24T07:00:00Z' },
    suggestedAction: 'Present systematic diversification plan with tax impact analysis',
    // Review round 1, Minor · 310_000 was the AAPL narrative's figure (Margaret Chen, a $6.8M
    // account) and survived onto a different client, account and security. The dollar amount that
    // actually needs trimming is the excess over the 10% IPS limit: pos-070's marketValue 390,000
    // minus 10% of acc-011's totalValue 2,800,000 (280,000) = 110,000.
    estimatedImpact: 110_000, createdAt: '2026-02-24T07:15:00Z', dismissed: false,
    // Review round 1, Important #3 · '/portfolios/accounts/acc-011/concentration' is not a route
    // (routes.tsx defines only accounts/:accountId, .../attribution and .../tax — no concentration
    // child). AccountDetailPage renders a "concentration" tab on the base account route, selected
    // via a ?tab= query param. Review round 2 correction: that ?tab= mechanism did not actually
    // work before this change — TabLayout never read the URL, so this route+params shape (matching
    // nba-007's own pre-existing actionRoute) silently landed on Overview rather than crashing.
    // TabLayout now reads `tab` from the URL (falling back to its prior defaultTab/tabs[0]
    // behavior when absent or unrecognised), so this actually opens the Concentration tab.
    actionRoute: { path: '/portfolios/accounts/acc-011', params: { tab: 'concentration' } },
  },
  {
    // D12 · Anderson's fixed income sleeve (acc-022/023/024/025, generated fallback) holds only
    // AGG and BND — no TLT to rotate out of. Rewritten to name the securities actually held.
    id: 'nba-008', title: 'Duration mismatch — Anderson fixed income',
    description: "Richard Anderson's fixed income is entirely AGG and BND, a blended effective duration of about 6.0 years against a 5.0-year target. Shortening with a short-duration sleeve would reduce rate sensitivity; estimate the tracking-error impact before trading.",
    category: 'risk', priority: 'medium',
    scoring: { urgency: 50, impact: 60, efficiency: 55, relationship: 40, confidence: 80, composite: 55 },
    clients: [{ id: 'cli-009', name: 'Richard Anderson' }],
    trigger: { source: 'pms', condition: 'duration_mismatch', value: '6.0y vs 5.0y target', detectedAt: '2026-02-23T14:00:00Z' },
    suggestedAction: 'Shorten duration with a short-duration bond sleeve',
    estimatedImpact: 22_000, createdAt: '2026-02-23T14:30:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/risk' },
  },
  // ── Client Service ──
  {
    id: 'nba-009', title: 'Birthday in 3 days — Michael Martinez (Mar 1)',
    // D10 · households.ts gives Michael Martinez's DOB as 1968-12-07; his birthday is 7 December,
    // not March 1. Note: `title`, `trigger.value` and `expiresAt` still frame this as "in 3 days"
    // / "Mar 1" — re-dating those is a scheduling restructure outside this task's scope (this NBA
    // may not even belong in a near-term bucket once correctly dated) and is flagged, not silently
    // left unnoticed. `aiMessage`, unlike those, is narrative text like `description` — it is the
    // string fed to the AI drafting flow (NBAFeed.tsx), so it gets the same one-phrase fix.
    description: 'Michael Martinez turns 58 on 7 December. Last year you sent a handwritten note and a restaurant gift card. High-touch clients value personal gestures.',
    category: 'client_service', priority: 'medium',
    scoring: { urgency: 75, impact: 30, efficiency: 85, relationship: 90, confidence: 99, composite: 69 },
    clients: [{ id: 'cli-006', name: 'Michael Martinez' }],
    trigger: { source: 'crm', condition: 'birthday_approaching', value: 'Mar 1 — 3 days', detectedAt: '2026-02-25T06:00:00Z' },
    suggestedAction: 'Send birthday card; AI can draft personalized message',
    estimatedImpact: 0, createdAt: '2026-02-25T06:15:00Z', expiresAt: '2026-02-28T23:59:00Z', dismissed: false,
    actionRoute: { openAI: true, aiMessage: 'Draft a personalized birthday message for Michael Martinez turning 58 on 7 December. Last year we sent a handwritten note and restaurant gift card.' },
  },
  {
    id: 'nba-010', title: 'Annual review overdue — Williams Household',
    description: 'David & Sarah Williams last had a formal review on 2025-04-15 — over 10 months ago. Gold tier requires semi-annual reviews.',
    category: 'client_service', priority: 'high',
    scoring: { urgency: 80, impact: 50, efficiency: 60, relationship: 85, confidence: 95, composite: 73 },
    clients: [{ id: 'cli-004', name: 'David Williams' }, { id: 'cli-005', name: 'Sarah Williams' }],
    trigger: { source: 'crm', condition: 'review_overdue', value: 'Last review: 2025-04-15', detectedAt: '2026-02-20T08:00:00Z' },
    suggestedAction: 'Schedule semi-annual review; AI can generate prep brief',
    estimatedImpact: 0, createdAt: '2026-02-20T08:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-004', openAI: true, aiMessage: 'Prepare a semi-annual review brief for David & Sarah Williams. Last review was 2025-04-15.' },
  },
  {
    id: 'nba-011', title: 'Life event detected — Raj Patel new baby',
    description: "Raj Patel mentioned a new baby during last call (Feb 18). This triggers beneficiary updates, life insurance review, 529 account opening, and estate plan revision.",
    category: 'client_service', priority: 'high',
    scoring: { urgency: 65, impact: 70, efficiency: 50, relationship: 95, confidence: 75, composite: 69 },
    clients: [{ id: 'cli-011', name: 'Raj Patel' }],
    trigger: { source: 'crm', condition: 'life_event', value: 'New child — mentioned Feb 18', detectedAt: '2026-02-18T16:00:00Z' },
    suggestedAction: 'Create onboarding checklist: beneficiary updates, 529, insurance, estate plan',
    estimatedImpact: 50_000, createdAt: '2026-02-18T16:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-011', openAI: true, aiMessage: 'Create a life event action plan for Raj Patel — new baby. Include: beneficiary updates, 529 account opening, life insurance review, estate plan revision.' },
  },
  // ── Compliance ──
  {
    id: 'nba-012', title: 'IPS review overdue — Johnson Household',
    // Terminology · "SEC best practice" attributed a firm practice to a regulator; the SEC does
    // not mandate this cadence. Corrected to attribute it to firm policy.
    description: 'The Johnson Household IPS was last reviewed on 2024-09-10 — over 17 months ago. Firm policy requires an annual IPS review.',
    category: 'compliance', priority: 'medium',
    scoring: { urgency: 65, impact: 45, efficiency: 55, relationship: 50, confidence: 90, composite: 60 },
    clients: [{ id: 'cli-001', name: 'Robert Johnson' }, { id: 'cli-002', name: 'Patricia Johnson' }],
    trigger: { source: 'compliance', condition: 'ips_review_overdue', value: 'Last: 2024-09-10', detectedAt: '2026-02-15T08:00:00Z' },
    suggestedAction: 'Schedule IPS review; AI can generate updated IPS draft',
    estimatedImpact: 0, createdAt: '2026-02-15T08:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-001' },
    complianceInfo: {
      nonDismissible: true,
      escalationLevel: 'advisor',
      deadline: '2026-03-15T23:59:00Z',
      auditTrail: [
        { action: 'created', timestamp: '2026-02-15T08:15:00Z', actor: 'system', note: 'IPS review overdue >12 months' },
        { action: 'viewed', timestamp: '2026-02-20T09:30:00Z', actor: 'advisor-sarah-kim' },
        { action: 'escalated', timestamp: '2026-02-25T08:00:00Z', actor: 'system', note: 'Auto-escalated: 10 days remaining before deadline' },
      ],
    },
  },
  {
    id: 'nba-013', title: 'Large transaction alert — Anderson wire $250K',
    // Terminology · "over $100K" was stated as a federal threshold; no such fixed federal dollar
    // threshold exists. Reworded as firm policy, with the actual regulatory hook named: the
    // FinCEN investment-adviser AML programme rule.
    description: "Richard Anderson's account received a $250K wire transfer yesterday. Firm policy requires source-of-funds documentation above $100,000. The FinCEN investment-adviser AML programme rule took effect 1 January 2026.",
    category: 'compliance', priority: 'critical',
    scoring: { urgency: 95, impact: 40, efficiency: 60, relationship: 30, confidence: 99, composite: 69 },
    clients: [{ id: 'cli-009', name: 'Richard Anderson' }],
    trigger: { source: 'custodian', condition: 'large_transaction', value: '$250,000 wire received', detectedAt: '2026-02-24T15:00:00Z' },
    suggestedAction: 'Contact client for source-of-funds documentation; file compliance report',
    estimatedImpact: 250_000, createdAt: '2026-02-24T15:15:00Z', expiresAt: '2026-02-26T17:00:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-009', openAI: true, aiMessage: 'Draft a source-of-funds request email for Richard Anderson regarding the $250K wire transfer received yesterday.' },
    complianceInfo: {
      nonDismissible: true,
      escalationLevel: 'supervisor',
      deadline: '2026-02-26T17:00:00Z',
      auditTrail: [
        { action: 'created', timestamp: '2026-02-24T15:15:00Z', actor: 'system', note: 'Large transaction >$100K — source-of-funds required' },
        { action: 'viewed', timestamp: '2026-02-24T15:30:00Z', actor: 'advisor-sarah-kim' },
        { action: 'escalated', timestamp: '2026-02-25T08:00:00Z', actor: 'system', note: 'Auto-escalated to supervisor: <48h remaining' },
      ],
    },
  },
  // ── Growth ──
  {
    id: 'nba-014', title: 'Held-away 401(k) review — Williams $1.2M',
    // Compliance §5.4 · reg-bi / fiduciary-standards / fee-disclosure / conflicts-of-interest —
    // this previously read "Consolidating could save ~$4,800/year in fees". The Williams household
    // is billed at 85 bps, so rolling $1.2M into an advisor-managed IRA ADDS roughly $10,200/year
    // against a plan cost of about $5,400 — a net increase of ~$4,800, not a saving. Rollover
    // recommendations are the exact fact pattern Reg BI's Care Obligation and DOL PTE 2020-02
    // target, and "you will save money" is the specific claim that gets cited.
    description: "David Williams holds $1.2M in a 401(k) at a former employer (Fidelity). Estimated plan cost is 0.45% ($5,400 a year); our schedule for this household is 0.85% ($10,200 a year), so a rollover would raise annual cost by about $4,800. Weigh that against consolidated tax management, household-level rebalancing and planning. Present both options, including leaving the assets in the plan.",
    category: 'growth', priority: 'medium',
    scoring: { urgency: 35, impact: 75, efficiency: 45, relationship: 65, confidence: 70, composite: 55 },
    clients: [{ id: 'cli-004', name: 'David Williams' }],
    trigger: { source: 'crm', condition: 'held_away_opportunity', value: '$1.2M at Fidelity 401(k)', detectedAt: '2026-02-10T08:00:00Z' },
    suggestedAction: 'Prepare a written rollover cost comparison and the PTE 2020-02 disclosure before any recommendation is made',
    estimatedImpact: 0,
    // Fee-increase figures must never feed the recommendation's priority score — that was the
    // conflict of interest at the heart of Compliance §5.4 (a rollover ranked higher precisely
    // because it cost the client more). estimatedImpactNote explains why this is 0, not a revenue
    // figure: rollover recommendations must be evaluated on the client's interest, not the fee
    // they generate.
    estimatedImpactNote: 'Not scored on revenue — a rollover recommendation must be evaluated on the client’s interest, not the fee it generates.',
    createdAt: '2026-02-10T08:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-004', openAI: true, aiMessage: 'Prepare a rollover cost comparison for David Williams: $1.2M 401(k) at Fidelity. Show plan cost against our schedule, list the non-fee considerations on both sides, and draft the PTE 2020-02 disclosure.' },
  },
  {
    id: 'nba-015', title: 'Referral follow-up — Thompson mentioned colleague',
    description: 'James Thompson mentioned his colleague Dr. Amanda Foster (orthopedic surgeon, ~$3M investable) during Feb 20 meeting. Follow up within 5 business days.',
    category: 'growth', priority: 'medium',
    scoring: { urgency: 70, impact: 80, efficiency: 65, relationship: 75, confidence: 60, composite: 71 },
    clients: [{ id: 'cli-008', name: 'James Thompson' }],
    trigger: { source: 'crm', condition: 'referral_mention', value: 'Dr. Amanda Foster — ~$3M', detectedAt: '2026-02-20T14:00:00Z' },
    suggestedAction: 'Send thank-you note to James; request introduction email; AI can draft outreach',
    estimatedImpact: 22_500, createdAt: '2026-02-20T14:15:00Z', dismissed: false,
    actionRoute: { path: '/growth', openAI: true, aiMessage: 'Draft a referral outreach email for Dr. Amanda Foster (orthopedic surgeon, ~$3M investable) — referred by James Thompson.' },
  },
  // ── Additional batch items for volume ──
  {
    id: 'nba-016', title: 'Quarterly review prep — Anderson Household',
    description: 'Richard & Susan Anderson have a quarterly review scheduled for Mar 5. Generate prep materials including performance summary, planning update, and discussion agenda.',
    category: 'client_service', priority: 'medium',
    scoring: { urgency: 70, impact: 45, efficiency: 80, relationship: 70, confidence: 90, composite: 68 },
    clients: [{ id: 'cli-009', name: 'Richard Anderson' }, { id: 'cli-010', name: 'Susan Anderson' }],
    trigger: { source: 'calendar', condition: 'upcoming_review', value: 'Mar 5 quarterly review', detectedAt: '2026-02-25T06:00:00Z' },
    suggestedAction: 'Generate AI meeting brief; review performance; prepare agenda',
    estimatedImpact: 0, createdAt: '2026-02-25T06:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-009', openAI: true, aiMessage: 'Generate a quarterly review prep brief for the Anderson Household — meeting scheduled Mar 5. Include performance summary, planning update, and discussion agenda.' },
  },
  {
    id: 'nba-017', title: 'Roth conversion window — Thompson IRA',
    description: "James Thompson's income will be lower this year in retirement. A partial Roth conversion of $150K could save significant taxes over 10+ years.",
    category: 'tax_management', priority: 'medium',
    scoring: { urgency: 55, impact: 70, efficiency: 45, relationship: 55, confidence: 72, composite: 59 },
    clients: [{ id: 'cli-008', name: 'James Thompson' }],
    trigger: { source: 'planning', condition: 'roth_conversion_opportunity', value: 'Lower income year', detectedAt: '2026-02-15T10:00:00Z' },
    suggestedAction: 'Model Roth conversion scenarios at $50K, $100K, $150K; project tax brackets',
    estimatedImpact: 38_000, createdAt: '2026-02-15T10:30:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/accounts/acc-020/tax' },
  },
  {
    id: 'nba-018', title: 'New model available — ESG Balanced Growth',
    description: 'The firm launched a new ESG Balanced Growth model. Three clients have expressed ESG preferences: Margaret Chen, Susan Anderson, Karen O\'Brien.',
    category: 'rebalancing', priority: 'low',
    scoring: { urgency: 20, impact: 40, efficiency: 70, relationship: 60, confidence: 65, composite: 43 },
    clients: [
      { id: 'cli-003', name: 'Margaret Chen' }, { id: 'cli-010', name: 'Susan Anderson' },
      { id: 'cli-014', name: "Karen O'Brien" },
    ],
    groupId: 'grp-003',
    trigger: { source: 'pms', condition: 'new_model_available', value: 'ESG Balanced Growth', detectedAt: '2026-02-22T12:00:00Z' },
    suggestedAction: 'Present ESG model comparison; show tracking error vs current allocation',
    estimatedImpact: 0, createdAt: '2026-02-22T12:15:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/rebalance' },
  },
  {
    id: 'nba-019', title: 'Account funding incomplete — Foster brokerage',
    description: "William Foster's new individual brokerage account (opened Feb 15) has not received the expected $200K initial deposit after 10 days.",
    category: 'compliance', priority: 'medium',
    scoring: { urgency: 65, impact: 35, efficiency: 70, relationship: 55, confidence: 88, composite: 59 },
    clients: [{ id: 'cli-017', name: 'William Foster' }],
    trigger: { source: 'custodian', condition: 'funding_incomplete', value: 'Expected $200K — 10 days', detectedAt: '2026-02-25T08:00:00Z' },
    suggestedAction: 'Contact William to verify wire details; check with custodian',
    estimatedImpact: 200_000, createdAt: '2026-02-25T08:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-017', openAI: true, aiMessage: 'Draft a follow-up email to William Foster about the expected $200K initial deposit for his new brokerage account. Verify wire details.' },
    complianceInfo: {
      nonDismissible: true,
      escalationLevel: 'none',
      deadline: '2026-03-10T23:59:00Z',
      auditTrail: [
        { action: 'created', timestamp: '2026-02-25T08:15:00Z', actor: 'system', note: 'Funding incomplete after 10 days' },
      ],
    },
  },
  {
    // D11 · acc-032 is on mod-006 (Education 529), whose equity target is 55% (45% US + 10%
    // intl), not 80% — no model in the fixtures targets 80% equity. Review round 1, Important #1:
    // the actual figure was also wrong (62%) — acc-032 has no explicit positions, so it uses
    // `getPositionsForAccount`'s generated fallback, whose equity weights (VTI 0.348 + QQQ 0.087
    // + EFA 0.145) sum to exactly 58.0%, independent of the account's totalValue.
    id: 'nba-020', title: 'Rebalancing overdue — O\'Brien 529',
    description: "The O'Brien 529 account hasn't been rebalanced in 14 months. The equity allocation has drifted from its 55% equity target to 58%.",
    category: 'rebalancing', priority: 'low',
    scoring: { urgency: 40, impact: 25, efficiency: 80, relationship: 45, confidence: 90, composite: 47 },
    clients: [{ id: 'cli-013', name: "Brian O'Brien" }],
    trigger: { source: 'pms', condition: 'rebalance_overdue', value: '14 months since last', detectedAt: '2026-02-24T08:00:00Z' },
    suggestedAction: 'Generate rebalance proposal to return to the 55/45 target',
    estimatedImpact: 0, createdAt: '2026-02-24T08:30:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/rebalance' },
  },
]
