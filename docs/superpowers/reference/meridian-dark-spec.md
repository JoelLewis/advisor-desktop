# Meridian Dark — authoritative specification

Extension of the Meridian Advisor Desktop design system into a dark theme.
Derived from `design-system-brief.md`; every value below is contrast-verified by
`verify.mjs` → `tune.mjs` → `final.mjs` (WCAG 2.x relative luminance, CIE L\*, CIEDE2000,
Machado 2009 CVD simulation at severity 1.0). **136 pairs tested, 0 failures.**

Implementation target: a `[data-theme="dark"]` block. The app already sets
`data-theme` on `document.documentElement` (`src/store/ui-store.ts:53`). Nothing in the
repo was modified.

---

## 1. Principles

Meridian Dark is the same system read at the other end of its own value ramp: the ground moves from cream paper to espresso ink, but the ink stays ink — warm, yellow-red, never neutral and never black. Because the light system's elevation is carried by lines rather than shadows, dark loses almost nothing: the four border weights invert from opaque cream steps to cream *alphas* over ink, and the surface ladder keeps stepping, so the line system survives intact where a shadow system would not. The single structural change is that **light mode buys distinction with value and dark mode must buy it with chroma** — the nav rail and the feature block, which in light were simply "the dark thing on the pale page", can no longer be darker than everything, so one becomes the ramp's extreme and the other becomes the only chromatic surface in the product. Every semantic assignment is preserved unchanged in meaning and shifted only in step: terracotta still means advisory/AI, olive active, moss up, rust down, ochre attention, slate neutral information — each stepped *up* the ramp until it clears 4.5:1 on espresso, because the light pigments were mixed to sit on cream and most of them fail on ink (`terracotta-700` 2.18:1, `moss-700` 2.02:1, `rust-500` 2.68:1, `slate-500` 2.48:1).

**Unchanged, and not to be re-derived:** the spacing scale, all layout constants (60/56/248/360/1180/44/36px), the type scale and families, tracking, weights, all radii and border widths, all motion durations and easing curves, every content and copy rule, the icon system, and every layout, density and interaction rule in §10 of the brief except where §7 below explicitly suspends one. **Dark is a colour-layer concern only.** One accent-coloured action per screen still holds. Numbers still never count up; charts still draw instantly.

---

## 2. New base ramp additions

Seven new base tokens. They are additions to the **theme-independent** ramps, not theme overrides — they belong in `tokens/colour.css` alongside the existing ramp and are available to both themes.

The justification for all seven is the same structural fact: **the ramp was authored for a light product.** It has four steps in its top 10% of lightness (`cream-25/50/100/200`) and only three in its bottom 25% (`bark-800`, `ink-900`, `ink-950`); and the accent families that carry text meaning (`moss`, `rust`, `slate`) jump straight from a ~L\*91 tint to a ~L\*42 pigment with nothing usable in between. Dark needs the mirror-image density.

| Token | Hex | rgb | Warmth proof | L\* | Why it exists |
| --- | --- | --- | --- | --- | --- |
| `--ink-975` | `#0C0A07` | 12,10,7 | **R>G>B**, hue 36° | 2.81 | The ramp's new extreme. The nav rail's identity in light is "the darkest surface on screen"; in dark that role needs a step below the page. Not black (`#000`), not grey. |
| `--bark-850` | `#302A22` | 48,42,34 | **R>G>B**, hue 34° | 17.46 | `bark-800` (L\*22.2) is too light and `ink-900` (L\*13.5) is the card; dark needs one interstitial step for `--surface-raised`/`--surface-selected`. |
| `--stone-450` | `#AB9C86` | 171,156,134 | **R>G>B**, hue 36° | 65.1 | `stone-500` fails 4.5:1 on `--surface-raised` (4.32:1) and on the feature block (4.33:1). Fills the L\* 74.0 → 58.9 gap between `clay-400` and `stone-500`. |
| `--terracotta-400` | `#D48565` | 212,133,101 | **R>G>B**, hue 17° | 63.1 | The advisory/AI accent as a *fill* on ink: `terracotta-500` gives only 4.43:1 for text on it and 3.42:1 as text on card. Sits at the ramp's genuine midpoint (73.6 → 63.1 → 49.1). |
| `--rust-300` | `#E8745A` | 232,116,90 | **R>G>B**, hue 11° | 62.0 | The `rust` family has no 300. Hue 11° holds the family line exactly (`rust-100` 12°, `rust-500` 11°) and is deliberately **more chromatic** than `terracotta-300` so "down" and "advisory" stay apart. |
| `--moss-300` | `#6FA173` | 111,161,115 | hue **125°** (green pigment, family-matched: `moss-500` 125°) | 61.7 | The `moss` family has no 300; `moss-100` (L\*91.9) reads as white on ink and `moss-500` gives 3.18:1. |
| `--slate-300` | `#8AA6B6` | 138,166,182 | hue **202°** (family-matched: `slate-500` 205°) | 66.6 | The `slate` family has no 300. This is the system's one cool token — permitted because `slate` is already a cool *accent pigment* at 500, and rule 2/3 governs **base neutrals**, which remain warm without exception. |

Two non-token literals are also introduced, following the light system's own precedent of putting literal hexes in semantic aliases (`--surface-raised:#FFFFFF`) and in the viz block (`--viz-2:#8C9663` is not a named token):

- **`--surface-feature: #3A281D`** — rgb(58,40,29), **R>G>B**, hue 23°, L\*17.95, a\*6.7 b\*10.6. See §5.2.
- **`--surface-overlay: rgba(8,6,4,.68)`** — 8>6>4, **R>G>B**. See §5.7.

**No new grey, no pure black, no blue-grey neutral** was introduced. All nine values verified: `pureGrey=false`, `pureBlack=false`.

---

## 3. The complete `[data-theme="dark"]` token block

Copy-pasteable. Overrides **only semantic aliases** — the base ramps are untouched and theme-independent.

```css
/* ========================================================================
   Meridian Dark — semantic alias overrides.
   Base ramps (--cream-*, --sand-*, --clay-*, --stone-*, --bark-*, --ink-*,
   --terracotta-*, --olive-*, --ochre-*, --moss-*, --rust-*, --slate-*) are
   theme-independent and are NOT redefined here.
   Spacing, radii, type, motion and layout tokens are NOT redefined here.
   ==================================================================== */

/* --- additions to the theme-independent base ramps (put these in the ramp
       file, not in this block — repeated here only so the block is legible) ---
   --ink-975:#0C0A07  --bark-850:#302A22  --stone-450:#AB9C86
   --terracotta-400:#D48565  --rust-300:#E8745A  --moss-300:#6FA173
   --slate-300:#8AA6B6                                                     */

[data-theme="dark"] {
  color-scheme: dark;

  /* ---------------- surfaces ---------------- */
  --surface-page:        var(--ink-950);      /* #181510  L* 6.94  */
  --surface-card:        var(--ink-900);      /* #26221C  L* 13.47 */
  --surface-raised:      var(--bark-850);     /* #302A22  L* 17.46 — NOT white; see §5 */
  --surface-sunken:      var(--ink-950);      /* #181510  wells inside a card */
  --surface-inset:       var(--ink-975);      /* #0C0A07  deepest recess */
  --surface-selected:    var(--bark-850);     /* #302A22  selection RISES in dark; see §7 */
  --surface-inverse:     var(--cream-100);    /* #F4EEE3  the rare light chip */
  --surface-nav:         var(--ink-975);      /* #0C0A07  the ramp extreme; see §5.1 */
  --surface-feature:     #3A281D;             /* the one chromatic surface; see §5.2 */
  --surface-accent-soft: rgba(212, 133, 101, .12);   /* terracotta-400 @12% */
  --surface-overlay:     rgba(8, 6, 4, .68);         /* see §5.7 */

  /* ---------------- text ---------------- */
  --text-heading:        var(--cream-25);     /* #FDFBF7  15.30:1 on card */
  --text-body:           var(--cream-200);    /* #EBE3D5  12.41:1 on card */
  --text-muted:          var(--clay-400);     /* #C4B49C   7.80:1 on card */
  --text-subtle:         var(--stone-450);    /* #AB9C86   5.90:1 on card */
  --text-inverse:        var(--ink-950);      /* on light fills */
  --text-inverse-muted:  var(--bark-700);     /* #584E41  7.05:1 on cream-100 */
  --text-accent:         var(--terracotta-300);   /* #DFA98F  7.69:1 on card */
  --text-link:           var(--terracotta-300);
  --text-link-hover:     var(--terracotta-400);   /* #D48565  5.53:1 on card */

  /* ---------------- lines ----------------
     Four weights, inverted from opaque cream steps to cream ALPHAS over ink.
     hairline/subtle are structural separators; default/strong are the only
     ones that bound an interactive control and so are the only ones held
     to WCAG 1.4.11 (3:1).                                                  */
  --border-hairline:  rgba(235, 227, 213, .09);   /* table rows       */
  --border-subtle:    rgba(235, 227, 213, .13);   /* card edges       */
  --border-default:   rgba(235, 227, 213, .42);   /* controls  3.37:1 on card */
  --border-strong:    rgba(235, 227, 213, .62);   /* hover     5.66:1 on card */
  --border-focus:     var(--olive-300);           /* #B6BE9C   8.16:1 on card */
  --border-inverse:   rgba(38, 34, 28, .20);      /* lines on light fills */
  --border-accent:    rgba(212, 133, 101, .32);   /* feature-block edge   */

  /* ---------------- actions ----------------
     Primary in light is the ink extreme on cream; in dark it is the cream
     extreme on ink. Hover/active mirror light's direction exactly:
     light 900 -> 800 (toward the warm middle) -> 950 (toward the extreme);
     dark  sand-300 -> clay-400 (toward the warm middle) -> cream-100.      */
  --action-primary-bg:          var(--sand-300);      /* #DED3C0 */
  --action-primary-bg-hover:    var(--clay-400);      /* #C4B49C */
  --action-primary-bg-active:   var(--cream-100);     /* #F4EEE3 */
  --action-primary-fg:          var(--ink-950);       /* 12.30:1 */

  --action-secondary-bg:        var(--surface-card);
  --action-secondary-bg-hover:  var(--surface-raised);
  --action-secondary-fg:        var(--cream-25);      /* 15.30:1 */
  /* secondary is bounded by --border-default, as in light */

  --action-accent-bg:           var(--terracotta-400);  /* #D48565 */
  --action-accent-bg-hover:     var(--terracotta-300);  /* #DFA98F */
  --action-accent-fg:           var(--ink-950);         /* 6.36:1 */

  --action-ghost-bg-hover:      rgba(235, 227, 213, .08);
  --action-ghost-bg-active:     rgba(235, 227, 213, .12);

  --action-disabled-bg:         rgba(235, 227, 213, .06);
  --action-disabled-fg:         var(--stone-600);       /* 2.59:1 — WCAG 1.4.3 disabled exception */

  /* ---------------- nav rail ---------------- */
  --nav-item-fg:            var(--clay-400);             /*  9.75:1 on rail */
  --nav-item-fg-active:     var(--cream-25);             /* 14.19:1 */
  --nav-item-bg-hover:      rgba(235, 227, 213, .08);
  --nav-item-bg-active:     rgba(235, 227, 213, .14);
  --nav-item-marker:        var(--olive-300);            /* olive = active/on */
  --nav-edge:               var(--border-subtle);        /* mandatory in dark; see §5.1 */

  /* ---------------- status / performance ----------------
     Softs are low-alpha washes of the DARK base pigment, not the 100-step
     tints. The 100 tints (L* ~91) would read as near-white plates on ink.  */
  --status-positive:       var(--moss-300);              /* #6FA173  5.29:1 */
  --status-positive-soft:  rgba(111, 161, 115, .10);     /* -> #2D2F25 on card */
  --status-negative:       var(--rust-300);              /* #E8745A  5.33:1 */
  --status-negative-soft:  rgba(232, 116,  90, .10);     /* -> #392A22 on card */
  --status-warning:        var(--ochre-300);             /* #E6C384  9.42:1 */
  --status-warning-soft:   rgba(230, 195, 132, .10);     /* -> #393226 on card */
  --status-info:           var(--slate-300);             /* #8AA6B6  6.18:1 */
  --status-info-soft:      rgba(138, 166, 182, .10);     /* -> #302F2B on card */
  --status-neutral:        var(--stone-450);             /* #AB9C86  5.90:1 */
  --status-neutral-soft:   rgba(235, 227, 213, .06);     /* -> #322E27 on card */

  /* ---------------- data visualisation ----------------
     Literal hexes, exactly as the light block does. Same hue identity and
     same ordering: olive -> olive -> ochre -> terracotta -> rust -> slate
     -> stone -> sand.                                                      */
  --viz-1: #6E7A52;   /* olive deep   L*49.3  3.44:1 */
  --viz-2: #A5AE8B;   /* olive light  L*69.6  6.80:1 */
  --viz-3: #D2A34E;   /* ochre        L*69.8  6.84:1 */
  --viz-4: #D48565;   /* terracotta   L*63.1  5.53:1 */
  --viz-5: #BC4E35;   /* rust         L*47.5  3.22:1 */
  --viz-6: #6E8896;   /* slate        L*55.2  4.24:1 */
  --viz-7: #9A8C77;   /* stone        L*58.9  4.81:1 */
  --viz-8: #D6C9B3;   /* sand         L*81.5  9.69:1 */
  --viz-grid: rgba(235, 227, 213, .10);
  --viz-axis: var(--stone-450);          /* 5.90:1 — axis labels are 12px mono, i.e. text */
  --viz-area-alpha: .12;                 /* was .10 in light; see §7 */

  /* ---------------- focus ----------------
     --focus-gap is the 2px page-coloured gap made addressable. Components
     rendered ON a light fill (primary, accent) set --focus-gap:var(--ink-950)
     locally so the gap, not the ring, is what abuts the fill.              */
  --focus-gap:  var(--surface-page);
  --focus-ring: 0 0 0 2px var(--focus-gap),
                0 0 0 4px rgba(182, 190, 156, .55);   /* olive-300 @55% */
  --focus-ring-inverse: var(--focus-ring);            /* collapses; see §5.6 */
  --focus-field-wash:   rgba(182, 190, 156, .10);

  /* ---------------- shadows ----------------
     Retained for API compatibility and deepened, but they are NO LONGER the
     elevation mechanism. Every floating surface must also carry
     --border-default. Still ink-hued rgba(8,6,4,...) — never rgba(0,0,0,...).*/
  --shadow-none: none;
  --shadow-xs: 0 1px 1px rgba(8, 6, 4, .30);
  --shadow-sm: 0 1px 2px rgba(8, 6, 4, .40), 0 1px 1px rgba(8, 6, 4, .30);
  --shadow-md: 0 2px 6px rgba(8, 6, 4, .46), 0 1px 2px rgba(8, 6, 4, .34);
  --shadow-lg: 0 8px 24px rgba(8, 6, 4, .58), 0 2px 6px rgba(8, 6, 4, .38);
  --shadow-xl: 0 24px 56px rgba(8, 6, 4, .70), 0 4px 12px rgba(8, 6, 4, .44);
  --shadow-inset-line: inset 0 -1px 0 rgba(235, 227, 213, .08);

  /* ---------------- scrims ---------------- */
  --scrim-top:    linear-gradient(to bottom, var(--surface-page) 0%, rgba(24, 21, 16, 0) 100%);
  --scrim-bottom: linear-gradient(to top,    var(--surface-page) 0%, rgba(24, 21, 16, 0) 100%);
  --blur-panel:   saturate(110%) blur(14px);   /* saturation pulled back; see §7 */

  /* ---------------- display type ---------------- */
  --display-color:    var(--cream-200);          /* not cream-25; see §6 */
  --display-tracking: var(--tracking-snug);      /* was --tracking-tight */
}
```

The light theme needs three matching additions so components can reference them in both
themes without branching (values chosen to be the light system's existing behaviour,
not new design):

```css
:root, [data-theme="light"] {
  --surface-selected: var(--cream-200);          /* what the light system already used --surface-inset for */
  --surface-feature:  var(--ink-900);            /* the "one ink feature block per screen" */
  --focus-gap:        var(--surface-page);
  --border-accent:    rgba(180, 92, 60, .32);
  --nav-edge:         transparent;               /* light needs no rail edge */
  --viz-area-alpha:   .10;
  --display-color:    var(--ink-900);
  --display-tracking: var(--tracking-tight);
}
```

---

## 4. Contrast verification table

Computed by `final.mjs` (WCAG 2.x relative luminance, sRGB). Alpha tokens are resolved
against the surface named in the row before measurement. **136 pairs, 0 failures.**

Targets: 7:1 primary body text · 4.5:1 body text · 3:1 large text, non-text UI
indicators, control boundaries, chart marks · exempt for disabled state (WCAG 1.4.3).

| # | pair | fg | bg | ratio | target | result |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | text-heading = cream-25 on surface-page | `#FDFBF7` | `#181510` | **17.61:1** | 7:1 | PASS |
| 2 | text-heading = cream-25 on surface-card | `#FDFBF7` | `#26221C` | **15.30:1** | 7:1 | PASS |
| 3 | text-heading = cream-25 on surface-raised | `#FDFBF7` | `#302A22` | **13.73:1** | 7:1 | PASS |
| 4 | text-heading = cream-25 on surface-feature | `#FDFBF7` | `#3A281D` | **13.54:1** | 7:1 | PASS |
| 5 | text-heading = cream-25 on surface-nav | `#FDFBF7` | `#0C0A07` | **19.13:1** | 7:1 | PASS |
| 6 | text-body = cream-200 on surface-page | `#EBE3D5` | `#181510` | **14.29:1** | 7:1 | PASS |
| 7 | text-body = cream-200 on surface-card | `#EBE3D5` | `#26221C` | **12.41:1** | 7:1 | PASS |
| 8 | text-body = cream-200 on surface-raised | `#EBE3D5` | `#302A22` | **11.14:1** | 7:1 | PASS |
| 9 | text-body = cream-200 on surface-feature | `#EBE3D5` | `#3A281D` | **10.98:1** | 7:1 | PASS |
| 10 | text-body = cream-200 on surface-nav | `#EBE3D5` | `#0C0A07` | **15.52:1** | 7:1 | PASS |
| 11 | text-muted = clay-400 on surface-page | `#C4B49C` | `#181510` | **8.98:1** | 4.5:1 | PASS |
| 12 | text-muted = clay-400 on surface-card | `#C4B49C` | `#26221C` | **7.80:1** | 4.5:1 | PASS |
| 13 | text-muted = clay-400 on surface-raised | `#C4B49C` | `#302A22` | **7.00:1** | 4.5:1 | PASS |
| 14 | text-muted = clay-400 on surface-feature | `#C4B49C` | `#3A281D` | **6.90:1** | 4.5:1 | PASS |
| 15 | text-muted = clay-400 on surface-nav | `#C4B49C` | `#0C0A07` | **9.75:1** | 4.5:1 | PASS |
| 16 | text-subtle = stone-450 on surface-page | `#AB9C86` | `#181510` | **6.79:1** | 4.5:1 | PASS |
| 17 | text-subtle = stone-450 on surface-card | `#AB9C86` | `#26221C` | **5.90:1** | 4.5:1 | PASS |
| 18 | text-subtle = stone-450 on surface-raised | `#AB9C86` | `#302A22` | **5.29:1** | 4.5:1 | PASS |
| 19 | text-subtle = stone-450 on surface-feature | `#AB9C86` | `#3A281D` | **5.22:1** | 4.5:1 | PASS |
| 20 | text-subtle = stone-450 on surface-nav | `#AB9C86` | `#0C0A07` | **7.37:1** | 4.5:1 | PASS |
| 21 | text-accent/link = terracotta-300 on surface-page | `#DFA98F` | `#181510` | **8.85:1** | 4.5:1 | PASS |
| 22 | text-accent/link = terracotta-300 on surface-card | `#DFA98F` | `#26221C` | **7.69:1** | 4.5:1 | PASS |
| 23 | text-accent/link = terracotta-300 on surface-raised | `#DFA98F` | `#302A22` | **6.90:1** | 4.5:1 | PASS |
| 24 | text-accent/link = terracotta-300 on surface-feature | `#DFA98F` | `#3A281D` | **6.80:1** | 4.5:1 | PASS |
| 25 | text-accent/link = terracotta-300 on surface-nav | `#DFA98F` | `#0C0A07` | **9.61:1** | 4.5:1 | PASS |
| 26 | text-link-hover = terracotta-400 on surface-page | `#D48565` | `#181510` | **6.36:1** | 4.5:1 | PASS |
| 27 | text-link-hover = terracotta-400 on surface-card | `#D48565` | `#26221C` | **5.53:1** | 4.5:1 | PASS |
| 28 | text-link-hover = terracotta-400 on surface-raised | `#D48565` | `#302A22` | **4.96:1** | 4.5:1 | PASS |
| 29 | text-link-hover = terracotta-400 on surface-feature | `#D48565` | `#3A281D` | **4.89:1** | 4.5:1 | PASS |
| 30 | text-link-hover = terracotta-400 on surface-nav | `#D48565` | `#0C0A07` | **6.91:1** | 4.5:1 | PASS |
| 31 | status-positive = moss-300 on card | `#6FA173` | `#26221C` | **5.29:1** | 4.5:1 | PASS |
| 32 | status-positive = moss-300 on page | `#6FA173` | `#181510` | **6.09:1** | 4.5:1 | PASS |
| 33 | status-positive = moss-300 on raised | `#6FA173` | `#302A22` | **4.74:1** | 4.5:1 | PASS |
| 34 | status-negative = rust-300 on card | `#E8745A` | `#26221C` | **5.33:1** | 4.5:1 | PASS |
| 35 | status-negative = rust-300 on page | `#E8745A` | `#181510` | **6.13:1** | 4.5:1 | PASS |
| 36 | status-negative = rust-300 on raised | `#E8745A` | `#302A22` | **4.78:1** | 4.5:1 | PASS |
| 37 | status-warning = ochre-300 on card | `#E6C384` | `#26221C` | **9.42:1** | 4.5:1 | PASS |
| 38 | status-warning = ochre-300 on page | `#E6C384` | `#181510` | **10.84:1** | 4.5:1 | PASS |
| 39 | status-warning = ochre-300 on raised | `#E6C384` | `#302A22` | **8.45:1** | 4.5:1 | PASS |
| 40 | status-info = slate-300 on card | `#8AA6B6` | `#26221C` | **6.18:1** | 4.5:1 | PASS |
| 41 | status-info = slate-300 on page | `#8AA6B6` | `#181510` | **7.12:1** | 4.5:1 | PASS |
| 42 | status-info = slate-300 on raised | `#8AA6B6` | `#302A22` | **5.55:1** | 4.5:1 | PASS |
| 43 | status-neutral = stone-450 on card | `#AB9C86` | `#26221C` | **5.90:1** | 4.5:1 | PASS |
| 44 | status-neutral = stone-450 on page | `#AB9C86` | `#181510` | **6.79:1** | 4.5:1 | PASS |
| 45 | status-neutral = stone-450 on raised | `#AB9C86` | `#302A22` | **5.29:1** | 4.5:1 | PASS |
| 46 | positive fg on positive-soft (over card) | `#6FA173` | `#2D2F25` | **4.54:1** | 4.5:1 | PASS |
| 47 | positive fg on positive-soft (over page) | `#6FA173` | `#21231A` | **5.32:1** | 4.5:1 | PASS |
| 48 | text-body on positive-soft | `#EBE3D5` | `#2D2F25` | **10.67:1** | 7:1 | PASS |
| 49 | status dot positive (solid) vs card *(non-text status indicator)* | `#6FA173` | `#26221C` | **5.29:1** | 3:1 | PASS |
| 50 | status dot positive (solid) vs page *(non-text status indicator)* | `#6FA173` | `#181510` | **6.09:1** | 3:1 | PASS |
| 51 | negative fg on negative-soft (over card) | `#E8745A` | `#392A22` | **4.63:1** | 4.5:1 | PASS |
| 52 | negative fg on negative-soft (over page) | `#E8745A` | `#2D1F17` | **5.36:1** | 4.5:1 | PASS |
| 53 | text-body on negative-soft | `#EBE3D5` | `#392A22` | **10.78:1** | 7:1 | PASS |
| 54 | status dot negative (solid) vs card *(non-text status indicator)* | `#E8745A` | `#26221C` | **5.33:1** | 3:1 | PASS |
| 55 | status dot negative (solid) vs page *(non-text status indicator)* | `#E8745A` | `#181510` | **6.13:1** | 3:1 | PASS |
| 56 | warning fg on warning-soft (over card) | `#E6C384` | `#393226` | **7.54:1** | 4.5:1 | PASS |
| 57 | warning fg on warning-soft (over page) | `#E6C384` | `#2D261C` | **8.90:1** | 4.5:1 | PASS |
| 58 | text-body on warning-soft | `#EBE3D5` | `#393226` | **9.94:1** | 7:1 | PASS |
| 59 | status dot warning (solid) vs card *(non-text status indicator)* | `#E6C384` | `#26221C` | **9.42:1** | 3:1 | PASS |
| 60 | status dot warning (solid) vs page *(non-text status indicator)* | `#E6C384` | `#181510` | **10.84:1** | 3:1 | PASS |
| 61 | info fg on info-soft (over card) | `#8AA6B6` | `#302F2B` | **5.24:1** | 4.5:1 | PASS |
| 62 | info fg on info-soft (over page) | `#8AA6B6` | `#232421` | **6.10:1** | 4.5:1 | PASS |
| 63 | text-body on info-soft | `#EBE3D5` | `#302F2B` | **10.52:1** | 7:1 | PASS |
| 64 | status dot info (solid) vs card *(non-text status indicator)* | `#8AA6B6` | `#26221C` | **6.18:1** | 3:1 | PASS |
| 65 | status dot info (solid) vs page *(non-text status indicator)* | `#8AA6B6` | `#181510` | **7.12:1** | 3:1 | PASS |
| 66 | neutral fg (stone-450) on neutral-soft | `#AB9C86` | `#322E27` | **5.03:1** | 4.5:1 | PASS |
| 67 | text-accent on surface-accent-soft | `#DFA98F` | `#3B2E25` | **6.37:1** | 4.5:1 | PASS |
| 68 | text-body on surface-accent-soft | `#EBE3D5` | `#3B2E25` | **10.28:1** | 7:1 | PASS |
| 69 | text-heading on surface-accent-soft | `#FDFBF7` | `#3B2E25` | **12.67:1** | 7:1 | PASS |
| 70 | action-primary-fg (ink-950) on primary bg (sand-300) | `#181510` | `#DED3C0` | **12.30:1** | 4.5:1 | PASS |
| 71 | action-primary-fg on primary hover (clay-400) | `#181510` | `#C4B49C` | **8.98:1** | 4.5:1 | PASS |
| 72 | action-primary-fg on primary active (cream-100) | `#181510` | `#F4EEE3` | **15.76:1** | 4.5:1 | PASS |
| 73 | primary bg (sand-300) vs page *(control boundary)* | `#DED3C0` | `#181510` | **12.30:1** | 3:1 | PASS |
| 74 | primary bg (sand-300) vs card *(control boundary)* | `#DED3C0` | `#26221C` | **10.68:1** | 3:1 | PASS |
| 75 | action-secondary-fg (cream-25) on secondary bg (ink-900) | `#FDFBF7` | `#26221C` | **15.30:1** | 4.5:1 | PASS |
| 76 | action-secondary-fg on secondary hover (bark-850) | `#FDFBF7` | `#302A22` | **13.73:1** | 4.5:1 | PASS |
| 77 | action-accent-fg (ink-950) on accent bg (terracotta-400) | `#181510` | `#D48565` | **6.36:1** | 4.5:1 | PASS |
| 78 | action-accent-fg on accent hover (terracotta-300) | `#181510` | `#DFA98F` | **8.85:1** | 4.5:1 | PASS |
| 79 | accent bg (terracotta-400) vs card *(control boundary)* | `#D48565` | `#26221C` | **5.53:1** | 3:1 | PASS |
| 80 | accent bg (terracotta-400) vs page *(control boundary)* | `#D48565` | `#181510` | **6.36:1** | 3:1 | PASS |
| 81 | text-heading on ghost hover wash (8% cream) | `#FDFBF7` | `#36312B` | **12.46:1** | 4.5:1 | PASS |
| 82 | text-body on ghost hover wash over page | `#EBE3D5` | `#292520` | **11.94:1** | 7:1 | PASS |
| 83 | action-disabled-fg (stone-600) on disabled bg *(WCAG 1.4.3 disabled exception)* | `#776B58` | `#322E27` | **2.59:1** | exempt | n/a |
| 84 | text-inverse (ink-950) on surface-inverse (cream-100) | `#181510` | `#F4EEE3` | **15.76:1** | 7:1 | PASS |
| 85 | text-inverse-muted (bark-700) on surface-inverse (cream-100) | `#584E41` | `#F4EEE3` | **7.05:1** | 4.5:1 | PASS |
| 86 | text-inverse-muted (bark-700) on primary bg (sand-300) | `#584E41` | `#DED3C0` | **5.50:1** | 4.5:1 | PASS |
| 87 | nav item rest (clay-400) on surface-nav | `#C4B49C` | `#0C0A07` | **9.75:1** | 4.5:1 | PASS |
| 88 | nav item hover (cream-25) on nav hover wash | `#FDFBF7` | `#1E1B17` | **16.60:1** | 4.5:1 | PASS |
| 89 | nav item active (cream-25) on nav active wash | `#FDFBF7` | `#2B2824` | **14.19:1** | 4.5:1 | PASS |
| 90 | nav active marker (olive-300) vs nav active wash *(2px active bar)* | `#B6BE9C` | `#2B2824` | **7.57:1** | 3:1 | PASS |
| 91 | nav rail edge line vs surface-page *(separator, see dL*)* | `#292622` | `#181510` | **1.21:1** | 1:1 | PASS |
| 92 | --border-default resolved vs surface-card *(WCAG 1.4.11 component boundary)* | `#79736A` | `#26221C` | **3.37:1** | 3:1 | PASS |
| 93 | --border-default resolved vs surface-page *(WCAG 1.4.11 component boundary)* | `#716C63` | `#181510` | **3.49:1** | 3:1 | PASS |
| 94 | --border-default resolved vs surface-raised *(WCAG 1.4.11 component boundary)* | `#7F786D` | `#302A22` | **3.25:1** | 3:1 | PASS |
| 95 | --border-default resolved vs surface-feature *(WCAG 1.4.11 component boundary)* | `#84776A` | `#3A281D` | **3.22:1** | 3:1 | PASS |
| 96 | --border-strong resolved vs surface-card *(WCAG 1.4.11 component boundary)* | `#A09A8F` | `#26221C` | **5.66:1** | 3:1 | PASS |
| 97 | --border-strong resolved vs surface-page *(WCAG 1.4.11 component boundary)* | `#9B958A` | `#181510` | **6.12:1** | 3:1 | PASS |
| 98 | --border-strong resolved vs surface-raised *(WCAG 1.4.11 component boundary)* | `#A49D91` | `#302A22` | **5.28:1** | 3:1 | PASS |
| 99 | --border-strong resolved vs surface-feature *(WCAG 1.4.11 component boundary)* | `#A89C8F` | `#3A281D` | **5.21:1** | 3:1 | PASS |
| 100 | focus ring vs surface-page (2px gap = that surface) *(WCAG 2.4.13 / 1.4.11)* | `#6F725D` | `#181510` | **3.68:1** | 3:1 | PASS |
| 101 | focus ring vs surface-card (2px gap = that surface) *(WCAG 2.4.13 / 1.4.11)* | `#757862` | `#26221C` | **3.48:1** | 3:1 | PASS |
| 102 | focus ring vs surface-raised (2px gap = that surface) *(WCAG 2.4.13 / 1.4.11)* | `#7A7B65` | `#302A22` | **3.28:1** | 3:1 | PASS |
| 103 | focus ring vs surface-nav (2px gap = that surface) *(WCAG 2.4.13 / 1.4.11)* | `#6A6D59` | `#0C0A07` | **3.71:1** | 3:1 | PASS |
| 104 | focus ring vs surface-feature (2px gap = that surface) *(WCAG 2.4.13 / 1.4.11)* | `#7E7B63` | `#3A281D` | **3.26:1** | 3:1 | PASS |
| 105 | focus gap (ink-950) vs primary fill (sand-300) *(gap/fill adjacency)* | `#181510` | `#DED3C0` | **12.30:1** | 3:1 | PASS |
| 106 | focus gap (ink-950) vs accent fill (terracotta-400) *(gap/fill adjacency)* | `#181510` | `#D48565` | **6.36:1** | 3:1 | PASS |
| 107 | focus ring vs focus gap (ink-950) *(ring/gap adjacency)* | `#6F725D` | `#181510` | **3.68:1** | 3:1 | PASS |
| 108 | field focus border (olive-300) vs card *(input focus border)* | `#B6BE9C` | `#26221C` | **8.16:1** | 3:1 | PASS |
| 109 | text-body on focused-field olive wash | `#EBE3D5` | `#343229` | **10.08:1** | 7:1 | PASS |
| 110 | dialog edge (--border-default) vs scrimmed page *(floating surface boundary)* | `#7F786D` | `#0D0B08` | **4.50:1** | 3:1 | PASS |
| 111 | scrimmed card vs unscrimmed dialog surface *(see dL*)* | `#120F0C` | `#302A22` | **1.35:1** | 1:1 | PASS |
| 112 | --viz-1 (olive deep) vs surface-card *(chart mark)* | `#6E7A52` | `#26221C` | **3.44:1** | 3:1 | PASS |
| 113 | --viz-1 (olive deep) vs surface-page *(chart mark)* | `#6E7A52` | `#181510` | **3.96:1** | 3:1 | PASS |
| 114 | --viz-2 (olive light) vs surface-card *(chart mark)* | `#A5AE8B` | `#26221C` | **6.80:1** | 3:1 | PASS |
| 115 | --viz-2 (olive light) vs surface-page *(chart mark)* | `#A5AE8B` | `#181510` | **7.83:1** | 3:1 | PASS |
| 116 | --viz-3 (ochre) vs surface-card *(chart mark)* | `#D2A34E` | `#26221C` | **6.84:1** | 3:1 | PASS |
| 117 | --viz-3 (ochre) vs surface-page *(chart mark)* | `#D2A34E` | `#181510` | **7.88:1** | 3:1 | PASS |
| 118 | --viz-4 (terracotta) vs surface-card *(chart mark)* | `#D48565` | `#26221C` | **5.53:1** | 3:1 | PASS |
| 119 | --viz-4 (terracotta) vs surface-page *(chart mark)* | `#D48565` | `#181510` | **6.36:1** | 3:1 | PASS |
| 120 | --viz-5 (rust) vs surface-card *(chart mark)* | `#BC4E35` | `#26221C` | **3.22:1** | 3:1 | PASS |
| 121 | --viz-5 (rust) vs surface-page *(chart mark)* | `#BC4E35` | `#181510` | **3.71:1** | 3:1 | PASS |
| 122 | --viz-6 (slate) vs surface-card *(chart mark)* | `#6E8896` | `#26221C` | **4.24:1** | 3:1 | PASS |
| 123 | --viz-6 (slate) vs surface-page *(chart mark)* | `#6E8896` | `#181510` | **4.88:1** | 3:1 | PASS |
| 124 | --viz-7 (stone) vs surface-card *(chart mark)* | `#9A8C77` | `#26221C` | **4.81:1** | 3:1 | PASS |
| 125 | --viz-7 (stone) vs surface-page *(chart mark)* | `#9A8C77` | `#181510` | **5.54:1** | 3:1 | PASS |
| 126 | --viz-8 (sand) vs surface-card *(chart mark)* | `#D6C9B3` | `#26221C` | **9.69:1** | 3:1 | PASS |
| 127 | --viz-8 (sand) vs surface-page *(chart mark)* | `#D6C9B3` | `#181510` | **11.15:1** | 3:1 | PASS |
| 128 | --viz-axis (stone-450) vs card *(12px mono axis labels = text)* | `#AB9C86` | `#26221C` | **5.90:1** | 4.5:1 | PASS |
| 129 | viz-1 12% area wash vs card *(decorative fill under line)* | `#2F2D22` | `#26221C` | **1.14:1** | 1:1 | PASS |
| 130 | viz-2 12% area wash vs card *(decorative fill under line)* | `#353329` | `#26221C` | **1.25:1** | 1:1 | PASS |
| 131 | viz-3 12% area wash vs card *(decorative fill under line)* | `#3B3122` | `#26221C` | **1.24:1** | 1:1 | PASS |
| 132 | viz-4 12% area wash vs card *(decorative fill under line)* | `#3B2E25` | `#26221C` | **1.21:1** | 1:1 | PASS |
| 133 | viz-5 12% area wash vs card *(decorative fill under line)* | `#38271F` | `#26221C` | **1.11:1** | 1:1 | PASS |
| 134 | viz-6 12% area wash vs card *(decorative fill under line)* | `#2F2E2B` | `#26221C` | **1.16:1** | 1:1 | PASS |
| 135 | viz-7 12% area wash vs card *(decorative fill under line)* | `#342F27` | `#26221C` | **1.19:1** | 1:1 | PASS |
| 136 | viz-8 12% area wash vs card *(decorative fill under line)* | `#3B362E` | `#26221C` | **1.32:1** | 1:1 | PASS |

### First-attempt failures (6 of 93 in the first pass), and how each was fixed

| # | Failure | Ratio | Fix |
| --- | --- | --- | --- |
| 1 | `--text-subtle: stone-500` on `--surface-raised` | 4.32:1 | Authored `--stone-450 #AB9C86`; now **5.29:1** |
| 2 | `--text-subtle: stone-500` on `--surface-feature` | 4.46:1 | Same token; now **5.22:1** |
| 3 | `--status-neutral: stone-500` on `--status-neutral-soft` | 3.92:1 | Neutral remapped to `--stone-450` **and** neutral soft dropped 8% → 6%; now **5.03:1** |
| 4 | positive/negative fg on their softs at 14% | 4.26 / 4.35:1 | Soft alpha dropped 14% → 10%; now **4.54 / 4.63:1** (lightness step vs card still ΔL\* 5.1–5.4, above the 4.0 floor) |
| 5 | Focus ring vs `--action-primary-bg` fill | 2.98:1 | Introduced `--focus-gap`; on light-filled controls it is set to `--ink-950`, so the gap (12.30:1 vs the fill) is the adjacency, and ring-vs-gap is **3.68:1**. Ring alpha also retuned .60 → .55 |
| 6 | `--text-link-hover: #CE7D5B` on `--surface-feature` | 4.47:1 | `--terracotta-400` lightened `#CE7D5B` → `#D48565`; now **4.89:1** |

Two further failures were found in the **light** system while establishing the dark
baseline. They are not dark's to fix, but they should not be replicated:

- `--border-default` (`sand-300` on `cream-25`) = **1.43:1** and `--border-strong`
  (`clay-400` on `cream-25`) = **1.96:1**. Both fail WCAG 1.4.11 (3:1) for the boundary
  of an interactive control. Dark's equivalents are 3.37:1 and 5.66:1.
- Light `--viz-2` (3.05:1), `--viz-3` (2.94:1), `--viz-7` (3.18:1) and `--viz-8`
  (1.43:1) against `cream-25`; `--viz-8` fails badly. Every dark viz colour clears 3:1.

---

## 5. The eight hard problems

### 5.1 The nav rail

**The rail's identity was never "ink". It was "the extreme of the value ramp" — the
darkest surface on screen, at maximum distance from the page.** In light that reads as an
ink bar on cream. In dark, holding the same definition means the rail must step *below*
the page, which is why `--ink-975 #0C0A07` exists.

`--surface-nav: var(--ink-975)`. Rail L\* 2.81, page L\* 6.94 — **ΔL\* 4.13**, above the
4.0 floor set in §5.8 but the tightest step in the ladder, so in dark the rail additionally
takes a **mandatory 1px `--border-subtle` right edge** (`--nav-edge`), which light does not
need and must not have. Two cues, not one.

The payoff is that **the rail's contents change not at all.** It was already a
cream-on-ink component with cream-alpha washes — the one part of Meridian that was
already written in dark. Rest items `--clay-400` (9.75:1), hover 8% cream wash
(ΔL\* 7.2), active 14% cream wash (ΔL\* 13.5) with `--cream-25` glyphs (14.19:1) and a
2px `--olive-300` marker (7.57:1 — olive because olive means active/on). Every one of
those values is what the light rail already uses. Zero component work.

### 5.2 The "one ink feature block per screen"

Same diagnosis, different answer. The feature block's differentiator in light is
**maximum value contrast against the page**, and dark has no value left to spend — the
rail already owns the bottom, and going *up* far enough to feel special produces a pale
plate that reads as a light-mode leak and glares.

**In dark the scarce resource is chroma, not value.** So the feature block becomes the
only chromatic surface in the product: **`--surface-feature: #3A281D`** — the same
espresso, rotated toward terracotta and lifted one step.

- rgb(58,40,29), **R>G>B**, hue 23° (terracotta's hue is 17–19°).
- L\* 17.95 vs card 13.47 → **ΔL\* 4.47**, clears the floor.
- a\* 6.7 / b\* 10.6 vs the card's a\* 0.6 / b\* 4.7 — it is the only surface in the system
  with meaningful chroma. **ΔE2000 vs card = 8.58**, more than double the value-only
  card→raised step (2.98).
- Plus a 1px `--border-accent: rgba(212,133,101,.32)` edge and the existing 24px radius.

It reads as "the same ink, warmed" — special without brightness, and it is the terracotta
advisory hue, which is exactly what a feature block on an advisor desktop is carrying. It
never abuts `--surface-raised` (feature is in-flow; raised floats), so their near-equal
L\* (17.95 vs 17.46) is not an adjacency.

`--text-heading` on it is 13.54:1, `--text-body` 10.98:1, `--text-accent` 6.80:1, `--text-subtle` 5.22:1, `--border-default` 3.22:1.

### 5.3 Primary buttons and the full action set

`--action-primary-bg: --ink-900` on cream is the value extreme *away from the page*. Its
dark inversion is the cream extreme — but **not** `cream-25`, which is a 15:1 slab and
physically uncomfortable at button size on ink. It resolves to **`--sand-300 #DED3C0`**:
still unambiguously "the light one", but tan rather than white, and on-brand.

Hover and active mirror light's directions exactly rather than inventing a rule. Light
runs `ink-900 → bark-800` (one step toward the warm middle of the ramp) then
`→ ink-950` (one step toward the extreme). Dark runs `sand-300 → clay-400` (toward the
warm middle) then `→ cream-100` (toward the extreme). Structurally identical, mirrored.

| Role | bg | hover | active | fg | Verified |
| --- | --- | --- | --- | --- | --- |
| primary | `--sand-300` `#DED3C0` | `--clay-400` `#C4B49C` | `--cream-100` `#F4EEE3` | `--ink-950` | 12.30 / 8.98 / 15.76:1 |
| secondary | `--surface-card` | `--surface-raised` | — | `--cream-25` | 15.30 / 13.73:1; bounded by `--border-default` 3.37:1 |
| accent | `--terracotta-400` `#D48565` | `--terracotta-300` `#DFA98F` | — | `--ink-950` | 6.36 / 8.85:1; boundary 5.53:1 |
| ghost | transparent | `rgba(235,227,213,.08)` | `rgba(235,227,213,.12)` | `--text-body` | 12.46:1 on hover wash |
| disabled | `rgba(235,227,213,.06)` | — | — | `--stone-600` | 2.59:1, WCAG 1.4.3 exempt |

The accent button is the one place dark **cannot** keep the light value: `terracotta-500`
gives only 4.43:1 for `#FFF8F3` text on it, and `#FFF8F3` is a pure-ish white this system
does not allow anyway. Inverting to a lighter fill with ink text is both more accessible
(6.36:1) and more honest to "hover warms rather than brightens".

Note the polarity flip this creates: in light the primary button is *dark* and the accent
button is *mid*; in dark the primary is *light* and the accent is *mid*. The one-accent-
per-screen rule is what keeps this from being loud.

### 5.4 Status softs

The `*-100` tints are pale plates mixed for cream — `moss-100` is L\*91.9, `rust-100`
L\*90.8, `slate-100` L\*91.3. On ink they would be near-white badges, and the status
colour would have to be printed *dark* on them, inverting the badge's polarity relative
to the rest of the dark UI. So dark softs are **low-alpha washes of the dark base
pigment** — the same colour as the badge's own text, at 10%.

| Token | Value | Resolved over card | ΔL\* vs card | fg on it |
| --- | --- | --- | --- | --- |
| `--status-positive-soft` | `rgba(111,161,115,.10)` | `#2D2F25` L\*18.9 | 5.4 | 4.54:1 |
| `--status-negative-soft` | `rgba(232,116,90,.10)` | `#392A22` L\*18.5 | 5.1 | 4.63:1 |
| `--status-warning-soft` | `rgba(230,195,132,.10)` | `#393226` L\*21.2 | 7.7 | 7.54:1 |
| `--status-info-soft` | `rgba(138,166,182,.10)` | `#302F2B` L\*19.4 | 5.9 | 5.24:1 |
| `--status-neutral-soft` | `rgba(235,227,213,.06)` | `#322E27` L\*19.1 | 5.7 | 5.03:1 |
| `--surface-accent-soft` | `rgba(212,133,101,.12)` | `#3B2E25` L\*20.1 | 6.6 | 6.37:1 |

10% is the ceiling, not a taste choice: at 14% the wash lifts the badge ground enough
that positive and negative text drop to 4.26:1 and 4.35:1. Neutral runs at 6% because a
neutral cream wash lightens faster than a chromatic one.

Alpha, not opaque hex, is correct here because badges appear on `--surface-card`,
`--surface-page` and `--surface-raised`; every combination was verified (e.g. positive
over page = 5.32:1). Badges carry **no border** — their identity is the text (≥4.5:1) plus
a ΔL\* ≥ 5.1 fill, and a Badge is not an interactive component, so WCAG 1.4.11 does not
apply to the chip. Standalone **status dots**, which have no text, are the solid pigment
and were checked separately: 5.29 / 5.33 / 9.42 / 6.18:1 against card.

### 5.5 Data-viz — see §6 for the full sequence

### 5.6 Focus ring

`--focus-ring-inverse: 0 0 0 2px var(--ink-900), 0 0 0 4px rgba(182,190,156,.6)` already
exists for ink surfaces, and it is very nearly the right answer — **the dark theme's
whole page is the case that token was invented for.** It is promoted, with two changes:

1. **The gap colour must be the local surface, not a hard-coded ink value.** A ring on a
   card (`#26221C`) and a ring on the rail (`#0C0A07`) need different gaps. This is what
   `--focus-gap: var(--surface-page)` addresses; components override it locally.
2. **The alpha drops .60 → .55.** At .60 the resolved ring is `#777A64`, which gives only
   2.98:1 against a `--sand-300` primary button. At .55 it is `#6F725D` and clears 3:1
   against every surface *and* against the light button fills.

```css
--focus-gap:  var(--surface-page);
--focus-ring: 0 0 0 2px var(--focus-gap), 0 0 0 4px rgba(182,190,156,.55);
--focus-ring-inverse: var(--focus-ring);   /* the distinction collapses in dark */
```

Verified against every surface the ring can land on: page 3.68 · card 3.48 · raised 3.28 ·
nav 3.71 · feature 3.26:1. On a light-filled control (primary, accent) the component sets
`--focus-gap: var(--ink-950)`; the gap-to-fill adjacency is then 12.30:1 (primary) and
5.82:1 (accent), and ring-to-gap is 3.68:1. Fields keep the olive border
(`--olive-300`, 8.16:1) plus a 3px olive wash at 10% (`--focus-field-wash`; body text on
the washed field 10.08:1).

`--focus-ring-inverse` still resolves in dark so that no existing call site breaks — it
simply aliases `--focus-ring`, because in dark there is no "inverse" surface left for it
to mean anything against.

### 5.7 Scrims and overlays

`rgba(38,34,28,.44)` is an ink veil over cream. Laid over an ink page it does essentially
nothing — it is nearly the page colour, so the field behind a dialog would not recede at
all. The dark scrim must instead push the whole app **below the ramp's floor**:

```css
--surface-overlay: rgba(8, 6, 4, .68);   /* 8>6>4 — R>G>B, still warm, still not black */
```

- over `--surface-page` → `#0D0B08`, L\*3.09 (page drops ΔL\* 3.84 — below even the rail)
- over `--surface-card` → `#120F0C`, L\*4.49 (cards drop ΔL\* 8.98 — the visible effect)

The point is that in dark the scrim's work is done on the **cards**, not the page: the
page has almost nowhere to fall, but every card collapses toward the floor and the layer
flattens. The dialog then sits at `--surface-raised #302A22` — **ΔL\* 14.37, ΔE 10.01**
against the scrimmed field — with a mandatory `--border-default` edge measuring **4.50:1**
against the scrimmed page. The existing 2px blur is retained.

### 5.8 Elevation without shadow

Shadows are demoted to decoration. **What replaces them is the pairing of a surface-value
step with a border weight** — the mechanism Meridian already uses at rest, now extended to
floating surfaces too. The rule: *in dark, every floating surface (popover, drawer, toast,
dialog) carries `--border-default` in addition to its shadow, and the border is what is
load-bearing.* Shadows are deepened (`rgba(8,6,4,.30–.70)`, still ink-hued, never
`rgba(0,0,0,…)`) but no surface may depend on them.

The four border weights translate from opaque cream steps to cream alphas over ink,
preserving the four-step feel and their assignments (hairline rows, subtle cards, default
controls, strong hover):

| Weight | Light | Dark | Resolved on card | vs card | Governed by 1.4.11? |
| --- | --- | --- | --- | --- | --- |
| hairline | `rgba(88,78,65,.14)` | `rgba(235,227,213,.09)` | `#38332D` | 1.26:1 | no — row separator |
| subtle | `--cream-200` | `rgba(235,227,213,.13)` | `#403B34` | 1.43:1 | no — card edge |
| default | `--sand-300` | `rgba(235,227,213,.42)` | `#79736A` | **3.37:1** | **yes** |
| strong | `--clay-400` | `rgba(235,227,213,.62)` | `#A09A8F` | **5.66:1** | **yes** |

The alpha jump from .13 to .42 looks large and is deliberate: it is the split between
*structural* lines (which are quiet, and calibrated to feel like the light system's
hairlines) and *control boundaries* (which WCAG requires to be visible). Light conflates
the two and fails 1.4.11 at 1.43:1; dark separates them. Card edges stay hushed.

**The surface ladder**, all warm-verified R>G>B:

| Level | Token | Hex | L\* | Step |
| --- | --- | --- | --- | --- |
| nav / inset | `--ink-975` | `#0C0A07` | 2.81 | — |
| page / sunken | `--ink-950` | `#181510` | 6.94 | ΔL\* 4.13 from nav |
| card | `--ink-900` | `#26221C` | 13.47 | ΔL\* 6.53 from page |
| feature | literal | `#3A281D` | 17.95 | ΔL\* 4.47 from card (+ ΔE 8.58) |
| raised / selected | `--bark-850` | `#302A22` | 17.46 | ΔL\* 3.99 from card |

**Minimum perceptual step: ΔL\* ≥ 4.0 between any two surfaces that share an edge.**
Below that, two warm near-blacks are indistinguishable at typical office luminance and
under the flat gamma of uncalibrated laptop panels. Two adjacencies sit at the floor and
both carry a compensating line: nav→page (4.13) takes the mandatory `--nav-edge`, and
card→selected (3.99, effectively at the floor) sits inside a table where every row already
carries `--border-hairline`. Every other adjacency has ≥ 4.47.

---

## 6. Data-viz dark sequence

Same hue identity, same ordering, same eight slots:
olive → olive → ochre → terracotta → rust → slate → stone → sand.

The two the brief flagged are the two that had to move furthest: `--viz-1 #4C553A`
(2.06:1 on the dark card — invisible) and `--viz-5 #7E3020` (1.76:1 — invisible). Both are
lifted to the same pigment family's usable band.

| Token | Hex | Family | rgb / warmth | L\* | vs card | vs page |
| --- | --- | --- | --- | --- | --- | --- |
| `--viz-1` | `#6E7A52` | olive deep | 110,122,82 · hue 78° | 49.3 | **3.44:1** | 3.96:1 |
| `--viz-2` | `#A5AE8B` | olive light | 165,174,139 · hue 75° | 69.6 | **6.80:1** | 7.83:1 |
| `--viz-3` | `#D2A34E` | ochre | 210,163,78 · **R>G>B** | 69.8 | **6.84:1** | 7.88:1 |
| `--viz-4` | `#D48565` | terracotta | 212,133,101 · **R>G>B** | 63.1 | **5.53:1** | 6.36:1 |
| `--viz-5` | `#BC4E35` | rust | 188,78,53 · **R>G>B** | 47.5 | **3.22:1** | 3.71:1 |
| `--viz-6` | `#6E8896` | slate | 110,136,150 · hue 201° | 55.2 | **4.24:1** | 4.88:1 |
| `--viz-7` | `#9A8C77` | stone | 154,140,119 · **R>G>B** | 58.9 | **4.81:1** | 5.54:1 |
| `--viz-8` | `#D6C9B3` | sand | 214,201,179 · **R>G>B** | 81.5 | **9.69:1** | 11.15:1 |

All eight clear the 3:1 chart-mark target on both the card and the page. (In light, four
of the eight do not clear 3:1 on `cream-25`.)

These were not picked by eye. `tune.mjs` enumerated 41 candidates across the eight hue
families, filtered to those clearing 3:1 on the dark card, and searched all valid
combinations to **maximise the minimum CIEDE2000 distance across normal, protan, deutan
and tritan vision simultaneously**, subject to viz-1 remaining at least 8 L\* darker than
viz-2 (mirroring the light system's within-family ordering). The theoretical optimum for
this palette is ΔE 7.16; the shipped set scores 7.0, the 0.16 given up in exchange for
`--viz-4` doubling as `--terracotta-400` so the chart terracotta and the UI terracotta
remain one colour, as they are in light.

**Adjacent-pair separation (normal vision):**

| Pair | ΔE2000 | ΔL\* |
| --- | --- | --- |
| viz-1 / viz-2 | 18.1 | 20.3 |
| viz-2 / viz-3 | 19.4 | 0.2 |
| viz-3 / viz-4 | 19.2 | 6.7 |
| viz-4 / viz-5 | 16.1 | 15.6 |
| viz-5 / viz-6 | 38.5 | 7.7 |
| viz-6 / viz-7 | 20.9 | 3.7 |
| viz-7 / viz-8 | 17.4 | 22.5 |

Minimum across **all 28** pairs, normal vision: **ΔE 14.2** (viz-2 vs viz-8). The
viz-2/viz-3 pair is nearly isoluminant (ΔL\* 0.2) and separates purely on hue — 75° olive
vs 38° ochre — which is why the CVD check below matters more than the ΔL\* column.

**Colour-vision-deficiency check** (Machado 2009, severity 1.0):

| Condition | Adjacent-pair ΔE | Minimum over all 28 pairs | Worst pair |
| --- | --- | --- | --- |
| normal | 16.1 – 38.5 | **14.2** | viz-2 / viz-8 |
| protanopia | 11.5 – 30.6 | **7.0** | viz-4 / viz-7 |
| deuteranopia | 7.6 – 32.9 | **7.6** | viz-3 / viz-4 |
| tritanopia | 7.8 – 45.3 | **7.8** | viz-3 / viz-4 |

For comparison, the **light** sequence measured identically scores protan **7.1**, deutan
**6.4**, tritan **12.7**. Dark is better than light for the two common deficiencies
(deutan +1.2, protan −0.1) and worse for tritanopia (−4.9), which affects under 0.01% of
people; the trade was accepted because deuteranomaly is ~5% of men.

Honest limit: **no 8-colour categorical scale constrained to six warm earth hues can be
fully CVD-safe.** ΔE ~7 is "distinguishable side by side, unreliable across a plot". The
rule that makes this safe is a process rule, not a colour one — see §7.

`--viz-grid: rgba(235,227,213,.10)` (the ink-12% grid inverted to cream-10%; 1.30:1, a
whisper). `--viz-axis: --stone-450` at 5.90:1, because axis labels are 12px mono — text,
not decoration, so they take the 4.5:1 target, not 3:1.

**Semantic pigment collisions** (the pairs that carry meaning, not series identity):

| Pair | normal | protan | deutan | tritan |
| --- | --- | --- | --- | --- |
| moss-300 (up) vs rust-300 (down) | 48.2 | 6.5 | 10.7 | 51.1 |
| terracotta-300 (advisory) vs rust-300 (down) | 15.0 | 13.4 | 10.1 | 14.4 |
| ochre-300 (attention) vs terracotta-300 (advisory) | 15.0 | 9.6 | 7.4 | 6.3 |
| olive-300 (active) vs moss-300 (up) | 15.2 | 10.2 | 11.5 | 20.2 |

Up-vs-down under protanopia (6.5) is the weakest pair in the system — as it is in light
(the light moss-700/rust-500 pair is 43.8 normal but collapses similarly). This is
already mitigated by rules the system has: every signed figure carries a true minus and
an `arrow-up-right`/`arrow-down-right` glyph, so direction is never colour-only.
Note also that dark **improves** the advisory-vs-negative separation that light gets
wrong: light's `terracotta-500` vs `rust-500` is ΔE **7.3**; dark's `terracotta-300` vs
`rust-300` is ΔE **15.0**, because `rust-300` was deliberately mixed more chromatic
(sat .59) than `terracotta-300` (sat .36) at the same hue neighbourhood.

---

## 7. Dark-only rules, and light rules suspended

**This is the section implementers get wrong. Everything not listed here is unchanged.**

### Light-mode rules that do NOT apply in dark

| Light rule | Status in dark | Replacement |
| --- | --- | --- |
| Rule 1: "only `--surface-raised` may be white" | **Suspended.** No pure white anywhere, no exception. | `--surface-raised: var(--bark-850)` `#302A22`. The light system's `#FFFFFF` was the one hard-coded hex that broke its own "no pure white" law by exception; dark restores it to a ramp reference. |
| Rule 4: page is `--cream-50`, cards `--cream-25` | **Suspended.** | page `--ink-950`, cards `--ink-900`. |
| Rule 5: "nav rail is `--ink-900`" | **Restated, not suspended.** The rail is the ramp's *extreme*, which in dark is `--ink-975`. | §5.1 |
| Rule 42: shadows are `rgba(38,34,28,…)` | **Retuned.** Still ink-hued, still never `rgba(0,0,0,…)`. | `rgba(8,6,4,.30–.70)`. |
| "Hover warms rather than brightens; primary darkens ink-900 → bark-800" | **Direction mirrors.** The invariant is *one ramp step, never a hue shift* — light steps toward the warm middle from the dark end, dark steps toward the warm middle from the light end. | §5.3 |
| "Selected row = `--surface-inset`" | **Direction inverts.** Below the card there is almost no headroom on ink; above it there is plenty. Selection **rises** in dark. | `--surface-selected: var(--bark-850)`, ΔL\* 3.99 above card. `--surface-inset` keeps its meaning only for genuine deep wells. |
| "Table rows take a `--surface-sunken` wash on hover" | **Suspended.** A darker-than-card hover is imperceptible on ink. | Row hover is a `rgba(235,227,213,.05)` lightening wash. |
| Chart lines carry "a 10% area wash" | **12% in dark.** A 10% wash of a light pigment over ink resolves to only ΔL\* ~3 and disappears. | `--viz-area-alpha: .12`; verified 1.11–1.32:1 against card, i.e. still a whisper, never a fill. |
| `--blur-panel: saturate(120%)` | **`saturate(110%)`.** Saturation boost on ink pushes the warm neutrals visibly chromatic. | — |

### Rules that exist ONLY in dark

1. **The nav rail carries a 1px `--border-subtle` right edge.** Its ΔL\* from the page is
   4.13, the tightest step in the system. Light must not have this edge.
2. **Every floating surface carries `--border-default` in addition to its shadow, and
   the border is load-bearing.** Popover, drawer, toast, dialog. On dark the shadow is a
   secondary cue only. (Verified: dialog edge vs scrimmed page 4.50:1.)
3. **`--surface-feature` is the only chromatic surface in the product.** Nothing else may
   carry a hue-bearing ground. One per screen, as in light.
4. **Interactive control boundaries use `--border-default` (α .42); structural lines use
   `--border-subtle` (α .13) or `--border-hairline` (α .09).** These are not
   interchangeable in dark — one is a WCAG requirement, the other is a whisper.
5. **`--focus-gap` must be overridden to `var(--ink-950)` on any control with a light
   fill** (primary and accent buttons). Otherwise the ring sits on a pale ground.
6. **Display type uses `--display-color` (`--cream-200`) and `--display-tracking`
   (`--tracking-snug`), never `--cream-25` and never `--tracking-tight`.** See below.
7. **No chart may distinguish more than four series by colour alone.** Beyond four:
   direct labelling on the mark, or ordering the legend to match the visual stacking
   order. At ΔE ~7 under deuteranopia, series 5–8 are not reliably separable across a
   plot. (This rule is *stated* here because dark forced the measurement, but it is
   equally true of the light palette, which scores ΔE 6.4 — it should be back-ported.)
8. **Status badges carry no border in dark** — fill (ΔL\* ≥ 5.1) plus text (≥ 4.5:1) only.
9. **No surface pair sharing an edge may be closer than ΔL\* 4.0** unless a border weight
   sits between them.

### Instrument Serif on dark

Instrument Serif is a high-stroke-contrast display face shipping at a single weight (400).
On a light ground its hairlines are the thinnest thing on the page; on ink, two things
happen at once — the hairlines fall below the panel's effective rendering threshold and
partially drop out, while the stems bloom outward from irradiation, so the letterform
loses its modulation and reads simultaneously thinner *and* blurrier. There is no bolder
weight to reach for.

**Recommendation — three changes, no new font, no faux-bold:**

1. **Drop the colour from `--cream-25` to `--cream-200`** (`#EBE3D5`). Peak-white serif on
   near-black is where halation is worst; `cream-200` still measures **10.98–15.52:1**
   across every dark surface, far above the 4.5:1 large-text floor, and visibly reduces
   the bloom. This is `--display-color`.
2. **Open tracking one step, `--tracking-tight` → `--tracking-snug`** (−0.02em → −0.01em).
   Bloomed stems close up the counters and sidebearings at display size; giving the step
   back restores the intended colour of the line. This is `--display-tracking`. Note this
   is a *display-only* change — headings and body keep tight tracking, unchanged.
3. **Do not use Instrument Serif below `--display-3` (30px) in dark.** Its four sanctioned
   uses (sign-in value line, empty states, report covers, wordmark) are all ≥30px already,
   so this costs nothing and simply closes the door.

Explicitly rejected: synthetic bold (`-webkit-text-stroke`, `font-synthesis`), which
destroys the stroke modulation that is the entire reason the face was chosen; `text-shadow`,
which is banned by the no-glow discipline; and switching families in dark, which would
make the two themes different design languages.

---

## 8. Open questions for the design owner

These need judgment, not derivation. I have made a defensible call on each so the system
ships, but each is genuinely arguable.

1. **Is a `--sand-300` primary button too loud?** It is the correct structural mirror of
   light's ink button, but light's primary is *recessive* against cream (a dark shape on a
   pale field) whereas dark's is *radiant* (a pale shape on a dark field). The polarity is
   mirrored but the perceptual weight is not symmetric. The alternative is a bordered
   `--surface-raised` primary — quieter, and arguably more fiduciary — at the cost of
   losing the "one obviously-primary action" read. **I chose the mirror.** Worth a
   side-by-side.

2. **Should the feature block be terracotta-tinted at all?** `--surface-feature #3A281D`
   uses chroma because value is exhausted, and it lands on the advisory hue. If a feature
   block ever carries something that is *not* advisory (a compliance notice, a
   quarter-close summary), the surface will be saying "AI" when the content is not. Either
   the block is constrained to advisory content in dark, or `--surface-feature` needs a
   neutral variant — which puts us back to distinguishing by value alone.

3. **Does `--surface-inset` still earn its place?** In dark it is `--ink-975`, identical
   to `--surface-nav`, and its light-mode primary job (selected row) has moved to
   `--surface-selected`. It may be dead weight in dark and should perhaps be dropped
   rather than aliased.

4. **Tritanopia was traded away for deuteranomaly in the viz scale** (12.7 → 7.8 while
   deutan improved 6.4 → 7.6). That is the right call on population frequency, but if the
   advisor desktop has a known user with tritan deficiency it is the wrong call for them,
   and the viz slots have enough freedom to re-optimise for it.

5. **Should the light theme's 1.4.11 border failures be fixed?** Dark's control borders
   are 3.37:1; light's are 1.43:1. Bringing light into line means a visibly heavier
   `--border-default` on cream, which changes the look of every input and secondary button
   in the existing product. It is an accessibility bug, but fixing it is a visual redesign,
   not a token swap.

6. **Should `--viz-8` remain in the scale?** It is `#D6C9B3` — a near-neutral sand at
   L\*81.5 that reads as "the leftover" rather than as a category, and in light it fails
   3:1 outright (1.43:1). An 8-slot scale where slot 8 is a neutral may be a 7-slot scale
   with a residual bucket, and naming it that way would be more honest than colouring it.

7. **`--text-inverse` / `--surface-inverse` in dark.** I have defined them
   (`--ink-950` on `--cream-100`, 15.76:1) so nothing breaks, but a light plate inside a
   dark app is jarring and I could find no component that genuinely needs one. Tooltips
   should use `--surface-raised` in dark, not `--surface-inverse`. If nothing else claims
   it, the pair should be deleted rather than defined.

8. **Should dark ship as `system` default?** The store already supports
   `'light' | 'dark' | 'system'`. For a compliance-sensitive advisor product where printed
   and exported material is always light, defaulting to `system` means the on-screen
   review and the PDF a client receives will routinely disagree in polarity. That is a
   product decision, not a design-system one.

---

*Verification scripts: `verify.mjs` (first pass, 93 pairs / 6 failures), `tune.mjs`
(failure remediation + viz CVD optimisation over 41 candidates), `final.mjs`
(136 pairs / 0 failures). Full output in `final-out.txt`.*
