# Creator Intelligence Console — UI Theme Specification
> **For Claude Code**: This document is a complete frontend design system and implementation blueprint. Follow every detail precisely. This is a production-grade analytics product — every decision should feel deliberate, data-forward, and premium. No emoji. No generic AI aesthetics. No purple gradients.

---

## 01. Design Philosophy

### Concept: "Signal over Noise"
The entire visual language is built on one idea: **raw data made legible**. Like a Bloomberg Terminal reimagined for the creator economy — dense but never cluttered, precise but never cold. Think a Reuters newsroom crossed with a high-end quant dashboard.

### Aesthetic Direction
- **Tone**: Refined utilitarian. Editorial precision. Financial data terminal vibes, but with warmth.
- **NOT**: SaaS generic. Dark mode cliché. Purple gradients. Glassmorphism blobs. Neon cyber.
- **YES**: Considered whitespace. Mono data typography. Sharp grid lines. Amber/gold data accents. Controlled density.
- **The one thing users remember**: A sidebar that feels like a mission control panel, and charts that look like they belong in a $10,000/month product.

### Two-Mode Split (Visual Identity)
The product has two distinct visual personalities — both share the same design system but express it differently:

| | **Explorer Mode** (Public) | **Studio Mode** (Authenticated) |
|---|---|---|
| **Feeling** | Open, confident, inviting | Locked in, operational, owned |
| **Accent color** | Amber `#F0A500` | Electric blue `#3B82F6` |
| **Sidebar** | Minimal, search-focused | Full mission control |
| **Header badge** | `EXPLORING` pill | `{ChannelName}` avatar + pill |
| **Charts** | Read-only, clean | Interactive, annotatable |
| **Copilot** | Hidden / teaser only | Always present, expanded |

---

## 02. Color System

Define ALL colors as CSS custom properties on `:root`. Never hardcode hex values in components.

```css
:root {
  /* === FOUNDATIONS === */
  --color-canvas:        #080A0F;   /* Page background — almost-black with blue tint */
  --color-surface-0:     #0D0F17;   /* Card base */
  --color-surface-1:     #111420;   /* Elevated card */
  --color-surface-2:     #171A28;   /* Hover / active state surface */
  --color-surface-3:     #1E2235;   /* Modal / overlay */

  /* === BORDERS === */
  --color-border-subtle: #1C1F2E;   /* Near-invisible dividers */
  --color-border-base:   #252840;   /* Default card borders */
  --color-border-strong: #353A5C;   /* Focused / interactive borders */

  /* === TEXT === */
  --color-text-primary:  #E4E8F2;   /* Main body text */
  --color-text-secondary:#8A90A8;   /* Labels, metadata */
  --color-text-muted:    #4A4F6A;   /* Disabled, placeholder */
  --color-text-inverse:  #080A0F;   /* Text on light backgrounds */

  /* === EXPLORER ACCENT (Amber/Gold) === */
  --color-amber-50:      #FFF8E7;
  --color-amber-100:     #FDEFC3;
  --color-amber-400:     #F5C542;
  --color-amber-500:     #F0A500;   /* PRIMARY explorer accent */
  --color-amber-600:     #CC8A00;
  --color-amber-glow:    rgba(240, 165, 0, 0.12);

  /* === STUDIO ACCENT (Blue) === */
  --color-blue-400:      #60A5FA;
  --color-blue-500:      #3B82F6;   /* PRIMARY studio accent */
  --color-blue-600:      #2563EB;
  --color-blue-glow:     rgba(59, 130, 246, 0.12);

  /* === SEMANTIC DATA COLORS === */
  --color-up:            #10B981;   /* Growth, positive delta */
  --color-up-muted:      rgba(16, 185, 129, 0.10);
  --color-down:          #F43F5E;   /* Drop, negative delta */
  --color-down-muted:    rgba(244, 63, 94, 0.10);
  --color-neutral:       #6366F1;   /* Stable / informational */
  --color-neutral-muted: rgba(99, 102, 241, 0.10);
  --color-warn:          #F59E0B;   /* Warning states */
  --color-warn-muted:    rgba(245, 158, 11, 0.10);

  /* === CHART PALETTE (ordered by usage) === */
  --chart-1: #3B82F6;   /* views */
  --chart-2: #F0A500;   /* engagement */
  --chart-3: #10B981;   /* subscribers */
  --chart-4: #8B5CF6;   /* watch time */
  --chart-5: #EC4899;   /* revenue (studio only) */
  --chart-6: #14B8A6;   /* impressions */

  /* === SPECIAL FX === */
  --gradient-canvas: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.07) 0%, transparent 70%);
  --gradient-card-shimmer: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.02) 50%, transparent 60%);
  --noise-texture: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
}
```

---

## 03. Typography

### Font Stack
```css
/* Import in <head> */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

:root {
  /* Display / Headers */
  --font-display: 'Syne', sans-serif;
  
  /* Body / UI text */
  --font-body: 'Instrument Sans', sans-serif;
  
  /* Data / Numbers / Code */
  --font-mono: 'DM Mono', monospace;
}
```

### Type Scale
```css
:root {
  /* Scale */
  --text-xs:   11px;
  --text-sm:   12px;
  --text-base: 14px;
  --text-md:   15px;
  --text-lg:   17px;
  --text-xl:   20px;
  --text-2xl:  24px;
  --text-3xl:  30px;
  --text-4xl:  38px;

  /* Metric numbers — always DM Mono, tabular */
  --text-metric-sm:  20px;
  --text-metric-md:  28px;
  --text-metric-lg:  36px;
  --text-metric-xl:  48px;
  
  /* Line heights */
  --leading-tight:  1.2;
  --leading-snug:   1.35;
  --leading-normal: 1.5;
  --leading-relaxed:1.65;

  /* Letter spacing */
  --tracking-tight:  -0.02em;
  --tracking-normal:  0em;
  --tracking-wide:    0.04em;
  --tracking-widest:  0.12em;  /* Used on labels, badges */
}
```

### Typography Rules
- **Page title** (channel name): `Syne 700`, `--text-3xl`, `--tracking-tight`, `--color-text-primary`
- **Section headers**: `Syne 600`, `--text-lg`, `--tracking-tight`
- **Metric values**: `DM Mono 500`, tabular-nums, `--text-metric-md` or larger
- **Metric labels**: `Instrument Sans 500`, `--text-sm`, `--tracking-widest`, `--color-text-muted`, UPPERCASE
- **Body copy / descriptions**: `Instrument Sans 400`, `--text-base`, `--leading-relaxed`
- **Data table cells**: `DM Mono 400`, `--text-sm`
- **Badge/pill text**: `DM Mono 500`, `--text-xs`, `--tracking-widest`, UPPERCASE
- **Navigation labels**: `Instrument Sans 500`, `--text-sm`
- **Copilot AI text**: `Instrument Sans 400`, `--text-base`, `--leading-relaxed` — never mono for conversational text

---

## 04. Spacing & Layout Grid

```css
:root {
  /* Spacing tokens */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radii */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-full: 9999px;

  /* Layout */
  --sidebar-width:        240px;
  --sidebar-collapsed:    64px;
  --copilot-panel-width:  360px;
  --header-height:        56px;
  --content-max-width:    1400px;
  --card-padding:         24px;
  --section-gap:          32px;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3);
  --shadow-lg:  0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4);
  --shadow-glow-amber: 0 0 24px rgba(240, 165, 0, 0.2);
  --shadow-glow-blue:  0 0 24px rgba(59, 130, 246, 0.2);
}
```

### App Shell Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR  [56px height, sticky, backdrop-blur]                   │
├──────────┬──────────────────────────────────────┬───────────────┤
│          │                                      │               │
│ SIDEBAR  │       MAIN CONTENT AREA             │   COPILOT     │
│ 240px    │       flex-1, scrollable            │   PANEL       │
│ sticky   │       max-width: 1400px             │   360px       │
│          │       padding: 32px                 │   (Studio     │
│          │                                      │    only)      │
│          │                                      │               │
└──────────┴──────────────────────────────────────┴───────────────┘
```

---

## 05. Core Components

### 5.1 Topbar
```
Height: 56px | Background: var(--color-surface-0) | border-bottom: 1px solid var(--color-border-subtle) | backdrop-filter: blur(12px) | position: sticky top: 0 | z-index: 100

LEFT:
  - Logo mark: Custom SVG (see Section 09) — 28px × 28px
  - Product name: "CIPHER" in Syne 700, --text-lg, --color-text-primary
    (or whatever name is used — use CIPHER as placeholder, all caps)
  - Version tag: pill "BETA" or "v1.0" in DM Mono, --text-xs

CENTER:
  - Search bar (Explorer mode): 480px wide, rounded-full border
    - Left icon: search SVG icon (16px)
    - Placeholder: "Search any YouTube channel..."
    - Right: Keyboard shortcut badge "⌘K" in DM Mono --text-xs
  - Empty (Studio mode): breadcrumb "Studio / Overview"

RIGHT:
  - Mode indicator badge (see Section 5.2)
  - Separator (1px vertical line, 20px tall)
  - Notification bell icon (Studio only)
  - User avatar + dropdown (Studio only) OR "Connect Channel" CTA button (Explorer)
```

### 5.2 Mode Indicator Badge
```
Explorer mode:
  Background: var(--color-amber-glow)
  Border: 1px solid var(--color-amber-500) at 40% opacity
  Text: "EXPLORING" — DM Mono 500, --text-xs, --tracking-widest, var(--color-amber-500)
  Left dot: 6px circle, var(--color-amber-500), pulsing animation (see animations)

Studio mode:
  Background: var(--color-blue-glow)
  Border: 1px solid var(--color-blue-500) at 40% opacity
  Left: Channel avatar thumbnail (24px × 24px, rounded-full)
  Text: "{ChannelName}" — Instrument Sans 500, --text-sm, var(--color-blue-400)
  Right: verified/checkmark SVG if applicable
```

### 5.3 Sidebar

**Explorer mode (minimal):**
```
Width: 240px | Background: var(--color-surface-0) | border-right: 1px solid var(--color-border-subtle)

Top section (logo area): 56px — matches topbar height

Navigation items (icon + label):
  - Overview          [grid-2x2 icon]
  - Search Channels   [search icon]  ← active state
  - Trending          [trending-up icon]
  - Compare           [git-branch icon]

Bottom section:
  - Divider
  - "Unlock Studio" CTA card (see Section 5.9)
  - GitHub / docs links
```

**Studio mode (full):**
```
Width: 240px | Same base styling

Top section:
  - Channel avatar (40px), channel name in Syne 600, sub count in DM Mono --text-sm --color-text-secondary

Navigation groups with group labels (--text-xs --tracking-widest --color-text-muted UPPERCASE):

  ANALYTICS
    - Overview          [layout-dashboard icon]
    - Videos            [play-circle icon]
    - Audience          [users icon]
    - Retention         [activity icon]

  ENGAGEMENT
    - Comments          [message-square icon]
    - Reactions         [heart icon]
    - Shares            [share-2 icon]

  AI TOOLS
    - Copilot           [cpu icon] ← animated subtle glow
    - A/B Thumbnails    [layers icon]
    - Script Helper     [file-text icon]

Bottom:
  - Settings           [settings icon]
  - Changelog          [git-commit icon]
  - Usage quota bar (see Section 5.10)
```

### 5.4 Active Navigation State
```css
.nav-item.active {
  background: var(--color-surface-2);
  border-left: 2px solid var(--accent-color);  /* amber in Explorer, blue in Studio */
  
  .nav-icon { color: var(--accent-color); }
  .nav-label { color: var(--color-text-primary); font-weight: 500; }
}

.nav-item:hover:not(.active) {
  background: var(--color-surface-1);
  transition: background 150ms ease;
}
```

### 5.5 Metric Cards (KPI Cards)
These are the most important UI element — the primary data delivery mechanism.

```
Card anatomy:
┌──────────────────────────────────────────┐
│  METRIC LABEL            [trend icon]    │  ← --text-xs UPPERCASE, --tracking-widest, --color-text-muted
│                                          │
│  2.4M                                    │  ← DM Mono 500, --text-metric-lg, --color-text-primary
│                                          │
│  +12.4%  vs last 30d                     │  ← delta badge + DM Mono --text-sm --color-text-secondary
│                                          │
│  ▁▃▅▄▆▇▆▅  [sparkline]                  │  ← 40px tall SVG sparkline
└──────────────────────────────────────────┘

Specs:
- Width: flex (fills grid column)
- Padding: var(--card-padding) = 24px
- Background: var(--color-surface-0)
- Border: 1px solid var(--color-border-base)
- Border-radius: var(--radius-lg)
- Box-shadow: var(--shadow-sm)

On hover:
- Background: var(--color-surface-1)
- Border-color: var(--color-border-strong)
- Transition: all 200ms ease

Delta badge (positive):
  - Background: var(--color-up-muted)
  - Color: var(--color-up)
  - Border-radius: var(--radius-sm)
  - Padding: 2px 6px
  - Font: DM Mono 500, --text-xs
  - Left icon: arrow-up SVG 10px

Delta badge (negative):
  - Background: var(--color-down-muted)
  - Color: var(--color-down)
  - Same shape, arrow-down icon

Sparkline:
  - Height: 40px, full width
  - Stroke: var(--accent-color) at 60% opacity
  - Fill: gradient from accent at 20% → transparent
  - Stroke-width: 1.5px
  - No axes, no labels
```

**KPI Grid Layout:**
```
Explorer: 4-column grid, gap: 16px
  Row 1: Total Views | Subscribers | Total Videos | Avg Views/Video
  Row 2: Engagement Rate | Watch Time | Impressions | Click-through Rate

Studio adds:
  Row 3: Revenue (blurred in explorer) | RPM | Comments | Shares
```

### 5.6 Chart Components

All charts use a consistent wrapper:

```
Chart card anatomy:
┌─────────────────────────────────────────────────────┐
│  Chart Title              [time range selector]     │
│  Subtitle / description in --color-text-secondary   │
│─────────────────────────────────────────────────────│
│                                                     │
│  [CHART AREA]                                       │
│                                                     │
│─────────────────────────────────────────────────────│
│  Legend items inline                [data source]   │
└─────────────────────────────────────────────────────┘

Time range selector: 
  Pill group — "7D | 28D | 90D | 1Y | All"
  Active pill: background var(--color-surface-3), border var(--color-border-strong)
  Font: DM Mono 500, --text-xs
  
Chart grid lines: 1px solid var(--color-border-subtle), dashed
Chart axis text: DM Mono 400, --text-xs, --color-text-muted
Tooltip: Surface-3 background, sharp border, DM Mono values, shadow-lg

Chart types and their specific treatments:

  LINE CHART (Views over time):
    - Primary line: var(--chart-1), stroke-width 2px
    - Area fill: gradient from chart-1 at 15% → transparent (bottom 30%)
    - Data points: 5px circles, appear on hover only
    - Crosshair: vertical dashed line on hover

  BAR CHART (Video performance):
    - Bars: var(--chart-2), border-radius top 3px
    - Hover: brighten + tooltip
    - Negative bars: var(--color-down)

  MULTI-LINE (Comparison):
    - Each line uses chart palette in order
    - Line labels float at line end
    - Hover highlights one line, dims others to 20% opacity

  DONUT (Traffic sources):
    - Segments use chart palette
    - Center: total value in DM Mono --text-metric-md
    - Legend: horizontal below, colored dots + labels

  HEATMAP (Upload timing):
    - Grid of hour × weekday
    - Color: canvas → amber-500 intensity scale
    - Cell hover tooltip: "Tue 3PM: 1.2M avg views"
    - Labels: DM Mono --text-xs
```

### 5.7 Data Table (Video List)
```
Table container:
- Background: var(--color-surface-0)
- Border: 1px solid var(--color-border-base)
- Border-radius: var(--radius-lg)
- Overflow: hidden

Header row:
- Background: var(--color-surface-1)
- Border-bottom: 1px solid var(--color-border-base)
- Font: Instrument Sans 500, --text-xs, --tracking-widest, UPPERCASE, --color-text-muted
- Padding: 12px 16px
- Sortable column: shows sort icon SVG on hover / active

Data rows:
- Padding: 14px 16px
- Border-bottom: 1px solid var(--color-border-subtle)
- Font: Instrument Sans 400, --text-base

On hover:
- Background: var(--color-surface-1)

Column specs:
  #   | Thumbnail (48×27px, radius-sm) + Title (Instrument Sans 500) + Published date (DM Mono --text-xs --color-text-muted)
  Views        | DM Mono 500, right-aligned
  Watch Time   | DM Mono 500, right-aligned
  Engagement   | Progress bar (32px wide, 4px tall) + DM Mono value
  CTR          | DM Mono 500 + colored dot (green/yellow/red based on value)
  Status       | Badge pill (see badge system)

Pagination:
  Bottom bar: "Showing 1–25 of 847" in DM Mono --text-sm
  Prev/Next buttons: ghost style
  Page size selector: "25 per page"
```

### 5.8 Copilot Panel (Studio only)

```
Position: fixed right: 0, full viewport height below topbar
Width: 360px
Background: var(--color-surface-0)
Border-left: 1px solid var(--color-border-base)
Transform: translateX(100%) when closed → translateX(0) when open
Transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1)

Panel header:
  - "AI COPILOT" in DM Mono 500, --text-xs, --tracking-widest, --color-text-muted
  - Animated status dot: breathing glow in var(--color-blue-500)
  - Model badge: "claude-3" pill
  - Minimize/close icon button

Conversation area:
  - Scrollable, flex-col-reverse
  - Messages:
    User: right-aligned, background var(--color-surface-2), border-radius 12px 12px 2px 12px
    AI: left-aligned, background var(--color-surface-1), border-radius 12px 12px 12px 2px
    Font: Instrument Sans 400, --text-sm, --leading-relaxed
  
  - AI message special elements:
    - Inline metric pull-outs: amber pill with DM Mono value
    - Suggestion chips below messages (horizontal scroll)
    - Code/data blocks: DM Mono, surface-3 background

Input area (bottom):
  - Border-top: 1px solid var(--color-border-subtle)
  - Textarea: auto-expand, max 4 rows
  - Send button: var(--color-blue-500) background, arrow-right icon
  - Quick prompts row (scrollable chips above input): "Summarize last 7 days" | "Best upload time" | "Suggest video topic"

Insight cards (auto-generated, appear between messages):
  Background: var(--color-surface-2)
  Border-left: 3px solid var(--color-amber-500)
  Contains: insight text + supporting metric + action button
```

### 5.9 "Unlock Studio" CTA Card (Explorer only, bottom of sidebar)
```
Background: linear-gradient(135deg, var(--color-surface-2), var(--color-surface-1))
Border: 1px solid var(--color-border-strong)
Border-radius: var(--radius-md)
Padding: 16px
Margin: 16px

Content:
  - Small icon: lock-open SVG, var(--color-amber-500)
  - Headline: "Unlock Studio" in Syne 600, --text-sm, --color-text-primary
  - Subtext: "Connect your channel for owner-only insights" in Instrument Sans 400, --text-xs, --color-text-secondary
  - Button: "Connect with YouTube" — full width, var(--color-amber-500) background, --color-text-inverse, Instrument Sans 600, --text-sm
    Left icon: YouTube SVG logo (custom, see Section 09)

Hover state on card:
  Border-color: var(--color-amber-500) at 50%
  Subtle background shift
```

### 5.10 Usage Quota Bar (Studio, sidebar bottom)
```
Label: "API USAGE" — --text-xs --tracking-widest --color-text-muted
Bar: 8px tall, full width, border-radius-full
  - Background track: var(--color-border-base)
  - Fill: gradient var(--color-blue-500) → var(--color-blue-400)
  - Fill width: CSS variable --quota-used set via JS
Value: "4,230 / 10,000" — DM Mono 400, --text-xs, --color-text-muted, right-aligned
```

### 5.11 Badge / Pill System
```css
/* Base badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}

/* Variants */
.badge-amber   { background: var(--color-amber-glow);   color: var(--color-amber-500); border: 1px solid rgba(240,165,0,0.3); }
.badge-blue    { background: var(--color-blue-glow);    color: var(--color-blue-400);  border: 1px solid rgba(59,130,246,0.3); }
.badge-green   { background: var(--color-up-muted);     color: var(--color-up);         border: 1px solid rgba(16,185,129,0.3); }
.badge-red     { background: var(--color-down-muted);   color: var(--color-down);       border: 1px solid rgba(244,63,94,0.3); }
.badge-neutral { background: var(--color-neutral-muted);color: var(--color-neutral);    border: 1px solid rgba(99,102,241,0.3); }
.badge-ghost   { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-base); }
```

### 5.12 Freshness / Data Trust Badges
These are critical for the "Trust UI" pillar. Place them on every chart and data section.

```
"LIVE" badge: pulsing green dot + "LIVE" text — badge-green
"CACHED 2H AGO" badge: clock icon + timestamp — badge-ghost  
"INDEXED 847/1,024 VIDEOS" — badge-neutral, info icon on hover with tooltip explanation
"ESTIMATED" — badge-amber with tooltip: "YouTube hides exact data for videos < 48h"
"PUBLIC DATA ONLY" — badge-ghost, shown in Explorer for any restricted metric

Data window label (below chart title):
"Showing data for: Mar 1 – Apr 30, 2025" — DM Mono 400, --text-xs, --color-text-muted
```

### 5.13 Skeleton Loading States
```
While data is loading, replace metric values and chart areas with skeleton elements.

Skeleton style:
  background: linear-gradient(90deg, var(--color-surface-1) 25%, var(--color-surface-2) 50%, var(--color-surface-1) 75%)
  background-size: 200% 100%
  animation: skeleton-shimmer 1.5s ease infinite
  border-radius: var(--radius-sm)

@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

Metric card loading:
  - Title area: skeleton 80px × 10px
  - Value area: skeleton 120px × 32px
  - Delta area: skeleton 60px × 16px
  - Sparkline: skeleton full-width × 40px
```

### 5.14 Empty States
```
When no channel is searched / no data:

Container:
  - Centered, max-width 400px
  - Padding: --space-16

Custom SVG illustration (generate): Abstract analytics graph with no data points — line chart that flatlines with a question mark at the end. Stroke: var(--color-border-strong). No fill colors.

Headline: "Search any channel to begin" — Syne 600, --text-2xl, --color-text-primary
Subtext: "Enter a channel name or paste a YouTube URL above" — Instrument Sans 400, --text-base, --color-text-secondary
Example buttons: "Try @MrBeast" | "Try @Veritasium" | "Try @MKBHD" — ghost badges, clickable
```

---

## 06. Page-Specific Layouts

### 6.1 Explorer — Channel Overview Page

```
URL: /explore/{channelHandle}

Layout (below topbar):
  ├── Channel Hero (see below)
  ├── KPI Grid (8 cards, 4-col)
  ├── [Row: Views Over Time chart (8-col) | Top Videos bar chart (4-col)]
  ├── [Row: Audience Geography map (6-col) | Traffic Sources donut (6-col)]
  ├── Upload Activity heatmap (full width)
  └── Recent Videos Table (full width)
      └── "Unlock 47 more signals in Studio" CTA banner

Channel Hero:
  Background: var(--color-surface-0), border-bottom: 1px solid var(--color-border-subtle)
  Padding: 24px 32px
  Height: ~100px
  
  LEFT:
    - Channel thumbnail: 64px circle with 2px border var(--color-amber-500)
    - Channel name: Syne 700, --text-3xl
    - Handle: @handle — DM Mono 400, --text-sm, --color-text-secondary
    - Sub count: DM Mono 500, --text-metric-sm + "subscribers" label
    
  RIGHT:
    - "EXPLORING" mode badge
    - "Share this analysis" icon button (share-2 icon)
    - Freshness badge: "Last indexed: 2h ago"
```

### 6.2 Studio — Dashboard Overview

```
URL: /studio

Layout:
  ├── Studio Welcome Bar (personalized, see below)
  ├── Pinned KPI Row (6 cards, user-configurable — drag handles visible on hover)
  ├── [Row: Revenue + RPM cards (unlocked, Studio-only styling)]
  ├── Main chart: Views + Watch Time + Revenue overlaid (multi-axis)
  ├── Audience Retention curve (full width — this is owner-only data)
  ├── [Row: Comment Sentiment donut (4-col) | Top comments table (8-col)]
  └── AI Recommendations feed (full width) — pulled from Copilot

Studio Welcome Bar:
  Background: gradient from var(--color-canvas) to var(--color-surface-0)
  Shows: "Good morning, {FirstName}. Your channel grew 2.3% this week."
  Text: Syne 500, --text-xl, --color-text-primary
  Sub: DM Mono 400, --text-sm, key stat
  Right: Quick action buttons "Upload analysis" | "Generate script" | "A/B thumbnails"
```

### 6.3 Studio — Video Detail Page

```
URL: /studio/videos/{videoId}

Layout:
  ├── Video hero (thumbnail 16:9 + title + quick stats)
  ├── Retention Curve (full width — signature Studio chart)
  ├── [Row: Engagement timeline (8-col) | Comment sentiment (4-col)]
  ├── Traffic sources breakdown
  ├── Viewer demographics
  └── Copilot auto-analysis card for this video

Retention Curve specific styling:
  - Y-axis: 0–100%, grid at 25/50/75
  - X-axis: video duration markers
  - Line: var(--chart-3) -- green
  - Average line: dashed, var(--color-text-muted)
  - Notable drop-off points: red circle markers with tooltip labels
  - "Audience average" benchmark overlay: var(--color-border-strong) dashed
  - Area fill below curve: gradient green → transparent
```

---

## 07. Motion & Animation

```css
/* === DURATION TOKENS === */
:root {
  --duration-fast:    100ms;
  --duration-base:    200ms;
  --duration-slow:    300ms;
  --duration-slower:  500ms;

  --ease-standard:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decelerate:  cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate:  cubic-bezier(0.4, 0, 1, 1);
  --ease-spring:      cubic-bezier(0.32, 0.72, 0, 1);
}

/* === KEY ANIMATIONS === */

/* Pulsing dot for live/active states */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}

/* Subtle breathing glow for Copilot icon */
@keyframes copilot-breathe {
  0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.3); }
  50%       { box-shadow: 0 0 20px rgba(59,130,246,0.6); }
}

/* Page entry: content fades up in staggered sequence */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Apply with increasing animation-delay: 0ms, 60ms, 120ms, 180ms per section */
.animate-fade-up { animation: fade-up 400ms var(--ease-decelerate) both; }

/* Number counter animation for metrics on load */
/* Use JS CountUp.js or equivalent — numbers animate from 0 to final value over 800ms */

/* Chart draw animation */
/* SVG path stroke-dashoffset animation from path length → 0, 600ms ease */

/* Copilot panel slide */
/* translateX(100%) → translateX(0), 300ms spring easing */

/* Card hover lift */
.card:hover {
  transform: translateY(-2px);
  transition: transform var(--duration-base) var(--ease-standard),
              box-shadow var(--duration-base) var(--ease-standard);
  box-shadow: var(--shadow-md);
}

/* Skeleton shimmer — defined in Section 5.13 */

/* Tooltip fade */
@keyframes tooltip-in {
  from { opacity: 0; transform: translateY(4px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

### Motion Rules
- All interactive elements: `transition: background var(--duration-base) ease, border-color var(--duration-base) ease`
- Page navigation: fade-up stagger on main content sections
- Charts: draw animation on first render (not on tab switch)
- Modals/panels: spring easing always
- Counters: numeric animation on viewport entry
- No animations on: skeleton loaders switching to real content (instant swap)
- Respect `prefers-reduced-motion`: wrap all non-essential animations

---

## 08. Interaction Patterns

### Search Flow (Explorer entry point)
```
1. Landing: Large centered search (below hero) — 600px wide, 52px tall
   Placeholder cycles through: "Search @MrBeast..." | "Paste channel URL..." | "Try @Veritasium..."
   
2. As user types: 
   - Dropdown appears (var(--color-surface-2), shadow-lg, border border-base)
   - Shows: channel avatar + name + sub count + "PUBLIC" badge
   - Keyboard navigable

3. On select:
   - URL pushState to /explore/{handle}
   - Topbar search updates to channel name
   - Content area: skeleton → animated load → data

4. Error state (channel not found / API limit):
   - Inline error below input: var(--color-down) text, alert-circle SVG icon
   - Helpful message: "Channel not found — try pasting the full URL"
```

### Studio OAuth Flow
```
1. "Connect with YouTube" button → OAuth popup/redirect (not full page)
2. During auth: button shows spinner + "Connecting..."
3. On success: 
   - Sidebar transforms from Explorer → Studio variant
   - Mode badge switches with a subtle flip animation
   - Welcome message appears at top of content
   - Copilot panel slides in from right
4. First-time Studio: brief onboarding tooltip sequence (not modal — tooltip anchored to nav items)
```

### Tooltip System
```
Trigger: hover after 300ms delay (no instant tooltips — feels too jumpy)
Style: 
  Background: var(--color-surface-3)
  Border: 1px solid var(--color-border-strong)
  Border-radius: var(--radius-md)
  Padding: 8px 12px
  Font: Instrument Sans 400, --text-sm
  Shadow: var(--shadow-lg)
  Max-width: 240px
Arrow: 6px triangle pointing to trigger
Animation: tooltip-in (see Section 07)

Data explanation tooltips (on metric labels + freshness badges):
  Same style but with:
  - Bold label at top
  - Description body
  - Optional "Learn more →" link in --color-blue-400
```

---

## 09. Custom SVG Icons & Illustrations

### Product Logo Mark (generate this SVG)
```
Concept: An abstract "signal waveform" that forms a stylized "C" (for Creator/Cipher)
- Three ascending vertical bars that curve into a C-shape at the top
- Stroke-based, 2px stroke-width
- Single color: current color (inherits from parent)
- Dimensions: 28×28 viewBox="0 0 28 28"
- Clean, geometric, scalable
```

### YouTube Connect Icon (generate this SVG)
```
- YouTube play button triangle inside a rounded rectangle
- Color: #FF0000 fill on the rect, white triangle
- 16×16 for inline use, 20×20 for buttons
- Use in: "Connect with YouTube" button, channel links
```

### Custom Data Icons (generate these SVGs, all 16×16, stroke-based, 1.5px stroke):
```
icon-views:       Eye with a bar chart inside the pupil
icon-watchtime:   Clock with a play button superimposed
icon-engagement:  A graph bar with a small heart at the peak
icon-retention:   A funnel with a percentage symbol
icon-revenue:     Bar chart with a dollar sign ascending bar
icon-copilot:     Circuit board pattern forming a brain silhouette
icon-indexed:     Document with a checkmark + small loading arc
icon-freshness:   Lightning bolt inside a refresh circle
```

### Hero Illustration (empty state, generate SVG)
```
Concept: Abstract analytics scene — a flat line chart that suddenly shows massive growth spike, with small human figure standing at the peak looking at the horizon. Data-punk aesthetic.

Style: Line art only, no fills. Stroke color: var(--color-border-strong). 
Size: 320×200px SVG. Embed inline.
```

---

## 10. Responsive Behavior

```
Breakpoints:
  --bp-sm:  640px
  --bp-md:  768px  
  --bp-lg:  1024px
  --bp-xl:  1280px
  --bp-2xl: 1536px

Desktop (≥1280px):
  Full sidebar (240px) + content + copilot panel (360px, if open)
  4-column KPI grid

Large tablet (1024–1279px):
  Sidebar collapses to icon-only (64px) with tooltip labels
  Copilot panel overlays content instead of pushing it
  4-column → 2-column KPI grid fallback

Tablet (768–1023px):
  Sidebar becomes drawer (hidden by default, hamburger toggle in topbar)
  Content full-width with 24px horizontal padding
  Charts: full-width stacked

Mobile (< 768px):
  This is primarily a desktop tool. Mobile shows:
  - Limited KPI view (2-col)
  - "Best experienced on desktop" sticky banner
  - Charts: horizontal scroll container
  - Copilot: bottom sheet instead of side panel
  - Navigation: bottom tab bar (Overview, Search, Studio, Menu)
```

---

## 11. Accessibility & Technical Requirements

### Accessibility
```
Color contrast: All text on backgrounds must meet WCAG AA (4.5:1 for normal, 3:1 for large)
  - --color-text-primary on --color-surface-0: passes
  - --color-text-secondary on --color-surface-0: verify, adjust if needed
  - --color-amber-500 on --color-canvas: check and use amber-400 if needed

Focus states:
  outline: 2px solid var(--color-blue-500)
  outline-offset: 2px
  Never remove outline for keyboard users (only hide for mouse via :focus-visible)

ARIA:
  - Nav: role="navigation" aria-label="Main navigation"
  - Charts: role="img" aria-label="[Chart description including key data]"
  - Live regions: aria-live="polite" for metric updates
  - Loading: aria-busy="true" during skeleton state

Reduced motion:
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Technical Stack Assumptions
```
Framework: React (with TypeScript preferred)
Charts: Recharts (customize with the color system above) OR D3.js for bespoke charts
Styling: CSS Modules or Tailwind with custom config extending the design tokens
Icons: Lucide React as base library, supplement with custom SVGs from Section 09
State: React Query for server state, Zustand or Context for UI state
Routing: React Router v6 or Next.js App Router
Animation: CSS transitions + Framer Motion for complex panel/page animations
Fonts: Loaded via @font-face with font-display: swap
```

### CSS Architecture
```
File structure:
  styles/
    tokens.css         ← All :root variables (colors, typography, spacing)
    reset.css          ← Modern CSS reset
    base.css           ← Global base styles, body, scrollbar
    components/        ← One file per component
      card.css
      badge.css
      sidebar.css
      topbar.css
      chart.css
      table.css
      copilot.css
    pages/             ← Page-specific overrides
    animations.css     ← All @keyframes
    themes/
      explorer.css     ← .mode-explorer overrides (amber accents)
      studio.css       ← .mode-studio overrides (blue accents)

Root element gets .mode-explorer or .mode-studio class
This allows clean accent swapping via CSS custom property overrides:

.mode-explorer { --accent-color: var(--color-amber-500); --accent-glow: var(--color-amber-glow); }
.mode-studio   { --accent-color: var(--color-blue-500);  --accent-glow: var(--color-blue-glow); }
```

### Custom Scrollbar
```css
/* Apply globally for consistent dark scrollbars */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--color-canvas); }
::-webkit-scrollbar-thumb { 
  background: var(--color-border-strong); 
  border-radius: var(--radius-full); 
}
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
```

### Body & Page Base
```css
body {
  background: var(--color-canvas);
  background-image: var(--gradient-canvas), var(--noise-texture);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 12. Do Not Do — Anti-Patterns

These are explicitly forbidden in this design system:

```
NEVER:
  - Purple gradients or any gradient on hero backgrounds
  - Glassmorphism blur cards as the primary card style
  - Rounded pill buttons as the primary action button (use radius-md square-ish)
  - Emojis anywhere in the UI
  - Generic AI chat bubble styling for Copilot (no floating orbs, no gradient chat bubbles)
  - White or light backgrounds in any primary UI surface
  - Inter, Roboto, or system-ui as display/headline fonts
  - Drop shadows that are too soft (must have strong Y-offset and opacity)
  - Icons without consistent stroke-width (all icons must be 1.5px stroke weight)
  - Animated gradient backgrounds ("aurora" effect)
  - Overuse of blur effects
  - Text on chart bars/segments (use tooltips instead)
  - Pie charts (use donut or bar charts)
  - Any color not from the defined palette
  - Bold text as a substitute for hierarchy (use font-size and color instead)
  - Success toasts that auto-dismiss in under 3 seconds

ALWAYS:
  - Use DM Mono for ALL numeric/metric display values
  - Show data source and freshness context near every chart
  - Keep the Explorer/Studio mode split visually clear
  - Add loading skeleton states before every data-dependent section
  - Test every chart with extreme values (0 views, 100M views, negative growth)
  - Ensure Studio-only features have a visual "locked" state in Explorer mode
```

---

## 13. Locked/Blurred Studio-Only Metrics (Explorer Mode)

When a metric is only available to authenticated channel owners:

```css
.metric-locked {
  position: relative;
  user-select: none;
  pointer-events: none;
}

.metric-locked .metric-value {
  filter: blur(8px);
  opacity: 0.4;
  /* Fake number visible but blurred: render a random plausible value */
}

.metric-locked::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 30%, var(--color-surface-0));
}
```

Overlay on locked section:
```
Lock icon (SVG) centered
Text: "Owner-only metric"
Sub: "Connect your channel to unlock"
CTA: "Unlock in Studio" → triggers OAuth flow
```

Show locked metrics as ghost/blurred cards in the KPI grid to demonstrate what's possible (revenue, retention, comments sentiment). This is intentional — they're teasers, not errors.

---

## 14. Implementation Priority Order

Build in this exact sequence for a coherent result:

```
Phase 1 — Foundation
  1. CSS tokens file (all variables)
  2. App shell (topbar + sidebar + content layout)
  3. Typography and badge components
  4. Skeleton loading component
  5. Mode switching (.mode-explorer / .mode-studio)

Phase 2 — Explorer Core
  6. Search bar + channel search dropdown
  7. Channel hero component
  8. KPI metric card (with sparkline)
  9. KPI grid layout
  10. "Connect" CTA sidebar card

Phase 3 — Charts
  11. Line chart wrapper with time range selector
  12. Bar chart component
  13. Donut chart
  14. Upload heatmap
  15. Video data table

Phase 4 — Studio Layer
  16. Studio sidebar variant
  17. Copilot panel (slide-in)
  18. Locked metric overlay for Explorer
  19. Revenue / RPM cards (Studio-only)
  20. Retention curve chart

Phase 5 — Polish
  21. All page transitions and animations
  22. Tooltip system
  23. Responsive breakpoints
  24. Accessibility audit
  25. Custom SVG icon generation
```

---

*End of UI Specification — Creator Intelligence Console v1.0*
*All design decisions above are intentional and should not be modified without updating this document.*
