---
name: advisor-design-system
description: Use when building UI components, layouts, or styling for AdvisorAI Desktop. Encodes the specific design system from the Design Spec for visual consistency.
---

# AdvisorAI Desktop Design System

## Color Tokens (CSS Custom Properties)

```css
:root {
  --surface-primary: #FFFFFF;    /* Card backgrounds, modals */
  --surface-secondary: #F8FAFC;  /* Page background */
  --surface-tertiary: #F1F5F9;   /* Hover states, subtle fills, zebra rows */
  --border-primary: #E2E8F0;     /* Card borders, dividers */
  --border-secondary: #CBD5E1;   /* Input borders, focused states */
  --text-primary: #0F172A;       /* Headings, primary body text */
  --text-secondary: #475569;     /* Secondary text, labels, metadata */
  --text-tertiary: #94A3B8;      /* Placeholder text, disabled states */
  --accent-blue: #2563EB;        /* Primary actions, links, selected states */
  --accent-green: #059669;       /* Positive values, success, up arrows */
  --accent-red: #DC2626;         /* Negative values, errors, down arrows, alerts */
  --accent-purple: #7C3AED;      /* AI-generated content indicator — ALWAYS use for AI */
}
```

## Typography

| Style | Font | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| Page Title | Inter | 24px | 600 | 32px | Page headings |
| Section Header | Inter | 18px | 600 | 28px | Card titles, section headings |
| Body | Inter | 14px | 400 | 20px | Default text |
| Body Strong | Inter | 14px | 600 | 20px | Emphasis, labels |
| Caption | Inter | 12px | 400 | 16px | Metadata, timestamps |
| Monospace | JetBrains Mono | 13px | 400 | 20px | Numbers, percentages, account numbers |
| Monospace Small | JetBrains Mono | 11px | 400 | 16px | Table cells, dense data |

## Layout Shell

```
┌──────────────────────────────────────────────────────┐
│ TopBar (56px)                              [🔔] [👤] │
├────────┬─────────────────────────────────────────────┤
│        │ BreadcrumbBar (40px)                        │
│ Side   │─────────────────────────────────────────────│
│ bar    │                                             │
│ 64/    │ Main Content (fluid)                        │
│ 240px  │                                             │
│        │                                             │
│        │─────────────────────────────────────────────│
│        │ StatusBar (28px)                            │
└────────┴─────────────────────────────────────────────┘
```

With AI Panel open (slides from right, 400px or 600px):
```
┌──────────────────────────────────────────────────────┐
│ TopBar                                               │
├────────┬──────────────────────────┬──────────────────┤
│        │ Main Content (shrinks)   │ AI Panel 400px   │
│ Side   │                          │                  │
│ bar    │                          │                  │
└────────┴──────────────────────────┴──────────────────┘
```

## Component Patterns

### Card Anatomy
```
┌─────────────────────────────────┐  border: 1px solid var(--border-primary)
│ [Icon] Title          [Action] │  border-radius: 8px
│─────────────────────────────────│  padding: 16px (header), 16px (body)
│ Content area                    │  background: var(--surface-primary)
│                                 │  box-shadow: 0 1px 3px rgba(0,0,0,0.04)
└─────────────────────────────────┘
```

### NBA Card Anatomy
```
┌─────────────────────────────────────────┐
│ [CategoryIcon] Category    Priority ●●● │  Category: colored badge
│ Title text (bold)                       │  Priority: 1-3 dots
│ Subtitle / description                  │
│ [ClientChip] [ClientChip] [+3 more]    │  Grouped clients
│─────────────────────────────────────────│
│ [Dismiss] [Snooze ▾] [Take Action →]   │  Action bar
└─────────────────────────────────────────┘
```

### Process Tracker
```
 ●────●────●────◐────○────○────○
 Done  Done Done Current Pending...

Each step: label, responsible party, SLA indicator, timestamp
```

## Animation Specifications

| Animation | Duration | Easing | Notes |
|---|---|---|---|
| Page transition | 200ms | ease-out | Fade + subtle slide |
| Drawer open/close | 250ms | ease-in-out | Slide from right |
| Modal open | 150ms | ease-out | Scale from 0.95 + fade |
| Modal close | 100ms | ease-in | Fade out |
| Skeleton shimmer | 1.5s | linear | Infinite loop |
| Hover state | 150ms | ease | Background color change |
| Sidebar collapse | 200ms | ease-in-out | Width transition |
| Toast enter | 300ms | spring | Slide from right |
| Toast exit | 200ms | ease-in | Fade + slide |
| Chart render | 500ms | ease-out | Progressive draw |
| Dropdown open | 150ms | ease-out | Scale Y from top |

All animations respect `prefers-reduced-motion: reduce` — disable or use instant transitions.

## Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| ≥1920px | 3-column dashboard, expanded sidebar |
| 1440-1919px | 2-column default, expanded sidebar |
| 1024-1439px | Collapsed sidebar (64px), full-width content |
| <1024px | Not supported — show "Desktop required" message |

## AI Content Indicator

**All AI-generated content** must be visually distinguished:
- Purple left border (3px solid var(--accent-purple))
- Or purple badge/icon
- AI chat messages: purple accent
- AI-generated documents: purple border card
- AI suggestions: purple dot indicator

## Spacing Scale

Use Tailwind's default spacing with these common patterns:
- Card padding: `p-4` (16px)
- Card gap: `gap-4` (16px)
- Section gap: `gap-6` (24px)
- Page padding: `p-6` (24px)
- Compact table rows: `py-2 px-3`
- Standard table rows: `py-3 px-4`

## Icon Usage

Use Lucide React icons throughout. Common mappings:
- Navigation: Home, Users, Briefcase, PieChart, CheckSquare, Settings
- Actions: Plus, Edit, Trash, Send, Download, Upload
- Status: CheckCircle, AlertTriangle, XCircle, Clock, Loader
- Financial: TrendingUp, TrendingDown, DollarSign, BarChart3
- AI: Sparkles (always in purple)
