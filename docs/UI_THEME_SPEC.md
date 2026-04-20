# SocialLens UI Theme Specification

> Source of truth for the design-token system and mode switching rules.
> All values are derived directly from `frontend/src/styles/tokens.css`.
> Do not invent new values - add them to `tokens.css` first, then document here.

---

## Token file locations

| File                        | Purpose                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ |
| `src/styles/tokens.css`     | **All** CSS variables. Import this first. Never hardcode values in components. |
| `src/styles/base.css`       | Global resets, body defaults, scrollbar styling                                |
| `src/styles/animations.css` | Keyframe definitions used by Framer Motion variants                            |

---

## Colour foundations

### Surfaces / backgrounds

| Token               | Value     | Usage                           |
| ------------------- | --------- | ------------------------------- |
| `--color-canvas`    | `#080A0F` | Page background                 |
| `--color-surface-0` | `#0D0F17` | Lowest card surface             |
| `--color-surface-1` | `#111420` | Standard card                   |
| `--color-surface-2` | `#171A28` | Elevated panel / sidebar        |
| `--color-surface-3` | `#1E2235` | Tooltip, popover, highest layer |

### Borders

| Token                   | Value     |
| ----------------------- | --------- |
| `--color-border-subtle` | `#1C1F2E` |
| `--color-border-base`   | `#252840` |
| `--color-border-strong` | `#353A5C` |

### Text

| Token                    | Value     | Usage                            |
| ------------------------ | --------- | -------------------------------- |
| `--color-text-primary`   | `#E4E8F2` | Body copy, headings              |
| `--color-text-secondary` | `#8A90A8` | Labels, meta                     |
| `--color-text-muted`     | `#4A4F6A` | Placeholders, disabled           |
| `--color-text-inverse`   | `#080A0F` | Text on light/accent backgrounds |

### Semantic data colours

| Token                   | Value                  | Usage                     |
| ----------------------- | ---------------------- | ------------------------- |
| `--color-up`            | `#10B981`              | Positive metric delta     |
| `--color-up-muted`      | `rgba(16,185,129,.10)` | Positive badge background |
| `--color-down`          | `#F43F5E`              | Negative metric delta     |
| `--color-down-muted`    | `rgba(244,63,94,.10)`  | Negative badge background |
| `--color-neutral`       | `#6366F1`              | No change / indeterminate |
| `--color-neutral-muted` | `rgba(99,102,241,.10)` | Neutral badge background  |
| `--color-warn`          | `#F59E0B`              | Warning states            |
| `--color-warn-muted`    | `rgba(245,158,11,.10)` | Warning badge background  |

---

## Mode accent system

The active mode is set by adding `.mode-explorer` **or** `.mode-studio` to the `<body>` element (done by `ModeProvider` in `src/lib/ModeContext.tsx`). Components reference only the abstract `--accent` token family - never hard-coded mode colours.

### Explorer mode (default) - Amber/Gold

Activated by `.mode-explorer` on `<body>`.

| Token           | Value                                |
| --------------- | ------------------------------------ |
| `--accent`      | `var(--color-amber-500)` → `#F0A500` |
| `--accent-400`  | `var(--color-amber-400)` → `#F5C542` |
| `--accent-600`  | `var(--color-amber-600)` → `#CC8A00` |
| `--accent-glow` | `rgba(240,165,0,.12)`                |
| `--shadow-glow` | `0 0 24px rgba(240,165,0,.2)`        |

### Studio mode - Electric Blue

Activated by `.mode-studio` on `<body>`.

| Token           | Value                               |
| --------------- | ----------------------------------- |
| `--accent`      | `var(--color-blue-500)` → `#3B82F6` |
| `--accent-400`  | `var(--color-blue-400)` → `#60A5FA` |
| `--accent-600`  | `var(--color-blue-600)` → `#2563EB` |
| `--accent-glow` | `rgba(59,130,246,.12)`              |
| `--shadow-glow` | `0 0 24px rgba(59,130,246,.2)`      |

**Rule:** Components must use `var(--accent)` and friends. Branching on mode inside a component's CSS is forbidden.

---

## Chart palette

Six fixed colours in usage order. Recharts charts must reference these tokens.

| Token       | Value     | Metric                |
| ----------- | --------- | --------------------- |
| `--chart-1` | `#3B82F6` | Views                 |
| `--chart-2` | `#F0A500` | Engagement            |
| `--chart-3` | `#10B981` | Subscribers           |
| `--chart-4` | `#8B5CF6` | Watch time            |
| `--chart-5` | `#EC4899` | Revenue (Studio only) |
| `--chart-6` | `#14B8A6` | Impressions           |

---

## Typography

### Font families

| Token            | Family          | Usage                          |
| ---------------- | --------------- | ------------------------------ |
| `--font-display` | Syne            | Page titles, section headings  |
| `--font-body`    | Instrument Sans | All body copy, labels, UI text |
| `--font-mono`    | DM Mono         | **All numeric/metric values**  |

**Rule:** Every number rendered in the UI must use `font-family: var(--font-mono)` with `font-variant-numeric: tabular-nums`.

### Type scale

| Token         | px  |
| ------------- | --- |
| `--text-xs`   | 11  |
| `--text-sm`   | 12  |
| `--text-base` | 14  |
| `--text-md`   | 15  |
| `--text-lg`   | 17  |
| `--text-xl`   | 20  |
| `--text-2xl`  | 24  |
| `--text-3xl`  | 30  |
| `--text-4xl`  | 38  |

### Metric number scale (DM Mono only)

| Token              | px  | Usage               |
| ------------------ | --- | ------------------- |
| `--text-metric-sm` | 20  | Sparkline labels    |
| `--text-metric-md` | 28  | Card metrics        |
| `--text-metric-lg` | 36  | KPI hero            |
| `--text-metric-xl` | 48  | Dashboard highlight |

### Line heights

`--leading-tight` 1.2 · `--leading-snug` 1.35 · `--leading-normal` 1.5 · `--leading-relaxed` 1.65

### Letter spacing

`--tracking-tight` -0.02em · `--tracking-normal` 0em · `--tracking-wide` 0.04em · `--tracking-widest` 0.12em

---

## Spacing scale

| Token        | px  |
| ------------ | --- |
| `--space-1`  | 4   |
| `--space-2`  | 8   |
| `--space-3`  | 12  |
| `--space-4`  | 16  |
| `--space-5`  | 20  |
| `--space-6`  | 24  |
| `--space-8`  | 32  |
| `--space-10` | 40  |
| `--space-12` | 48  |
| `--space-16` | 64  |

---

## Border radius

| Token           | px   |
| --------------- | ---- |
| `--radius-sm`   | 4    |
| `--radius-md`   | 8    |
| `--radius-lg`   | 12   |
| `--radius-xl`   | 16   |
| `--radius-full` | 9999 |

---

## Layout constants

| Token                   | Value  | Usage                              |
| ----------------------- | ------ | ---------------------------------- |
| `--sidebar-width`       | 240px  | Expanded sidebar                   |
| `--sidebar-collapsed`   | 64px   | Icon-only sidebar                  |
| `--copilot-panel-width` | 360px  | Studio Copilot slide-in            |
| `--header-height`       | 56px   | Topbar                             |
| `--content-max-width`   | 1400px | Main content area                  |
| `--card-padding`        | 24px   | Standard card interior padding     |
| `--section-gap`         | 32px   | Vertical gap between page sections |

---

## Shadows

| Token                 | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| `--shadow-sm`         | `0 1px 3px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3)`    |
| `--shadow-md`         | `0 4px 16px rgba(0,0,0,.5), 0 2px 4px rgba(0,0,0,.3)`   |
| `--shadow-lg`         | `0 12px 40px rgba(0,0,0,.6), 0 4px 12px rgba(0,0,0,.4)` |
| `--shadow-glow-amber` | `0 0 24px rgba(240,165,0,.2)`                           |
| `--shadow-glow-blue`  | `0 0 24px rgba(59,130,246,.2)`                          |
| `--shadow-glow`       | Resolves to mode glow via `.mode-*` class               |

---

## Motion

### Durations

| Token               | ms  |
| ------------------- | --- |
| `--duration-fast`   | 100 |
| `--duration-base`   | 200 |
| `--duration-slow`   | 300 |
| `--duration-slower` | 500 |

### Easings

| Token               | Curve                            |
| ------------------- | -------------------------------- |
| `--ease-standard`   | `cubic-bezier(0.4, 0, 0.2, 1)`   |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)`     |
| `--ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)`     |
| `--ease-spring`     | `cubic-bezier(0.32, 0.72, 0, 1)` |

**Rule:** Framer Motion is allowed for panel/page transitions only. Do not apply it to micro-interactions (hover, focus) - use CSS transitions with the tokens above.

---

## Special effects

| Token                     | Usage                                              |
| ------------------------- | -------------------------------------------------- |
| `--gradient-canvas`       | Subtle blue radial glow behind page content        |
| `--gradient-card-shimmer` | Loading shimmer overlay on skeleton cards          |
| `--noise-texture`         | Inline SVG fractal noise at 3% opacity on surfaces |

**Forbidden effects** (per CLAUDE.md):

- Purple gradients or aurora/glow hero backgrounds
- Glassmorphism as a primary card style
- `filter: blur` on backgrounds (allowed only for locked-metric overlays)
- Animated gradient borders

---

## Focus ring

| Token                 | Value                             |
| --------------------- | --------------------------------- |
| `--focus-ring`        | `2px solid var(--color-blue-500)` |
| `--focus-ring-offset` | `2px`                             |

---

## Tailwind usage rules

- **Allowed:** layout, spacing, sizing, flex/grid utilities
- **Not allowed:** Tailwind colour palette (e.g. `bg-blue-500`), Tailwind typography, arbitrary values (`text-[13px]`, `bg-[#0f172a]`)
- All colours, typography, shadows, and borders come from CSS tokens only
