# SocialLens Frontend  -  Claude Code Rules (Source of Truth)

> Read docs/UI_THEME_SPEC.md before touching ANY component or style.
> This file + that spec = the only two sources of truth.

---

## Stack (no new libraries)

* Vite + React 18 + TypeScript (strict mode)
* Tailwind CSS (with custom token config  -  do not use arbitrary values like `text-[13px]`)
* shadcn/ui  -  import from `@/components/ui/*`
* TanStack Query v5 for all server state
* Recharts for charts (customized via the color system in the spec)
* Framer Motion for panel/page animations only
* Lucide React for base icons + custom SVGs in `src/assets/icons/`
* React Router v6

If a new library seems necessary, STOP and explain why before proceeding.

## File Structure (place NEW files here; no migrations unless explicitly asked)

```
src/
  styles/
    tokens.css        ← ALL CSS variables live here, nowhere else
    base.css
    animations.css
  components/
    ui/               ← shadcn primitives only
    common/           ← shared app components (Badge, Card, Skeleton, Tooltip)
    charts/           ← chart wrappers
    layout/           ← Topbar, Sidebar, CopilotPanel, AppShell
    explorer/         ← Explorer-mode specific components
    studio/           ← Studio-mode specific components
  pages/
  hooks/
  lib/
```

## Non-Negotiables

* **Zero hardcoded hex values in components.** CSS variables from `tokens.css` only.
* **Zero emojis** anywhere in UI, copy, or placeholder text.
* **Zero new font families.** Stack is: Syne (display) + Instrument Sans (body) + DM Mono (all numbers).
* **All numeric/metric values use DM Mono** with `font-variant-numeric: tabular-nums`.
* Components must use `var(--accent)` (and related accent tokens). Mode sets accent via `.mode-explorer` / `.mode-studio` on `<body>` using tokens (do not branch on mode inside component CSS).
* Do not refactor files unrelated to the current task.
* Do not rewrite working components to "clean them up" unless explicitly asked.

## Tailwind rule

* Tailwind is allowed for layout, spacing, sizing, flex/grid.
* Colors, typography, shadows, and borders must come from CSS tokens/variables (not Tailwind palette and not arbitrary values).
* No Tailwind arbitrary values (e.g., `text-[13px]`, `bg-[#0f172a]`).

## Workflow (every single task)

1. State the exact files you will create or modify  -  nothing else.
2. Implement the smallest diff that satisfies the acceptance criteria.
3. Run: `npm run typecheck && npm run lint` (run tests only when relevant tests exist for touched files; otherwise skip).
4. Summarize: what changed, what to manually verify in browser.

## Build Order (do not skip or reorder)

* [ ] 1. `styles/tokens.css`  -  full CSS variable system
* [ ] 2. `styles/base.css` + `styles/animations.css`
* [ ] 3. AppShell layout (Topbar + Sidebar + main grid)
* [ ] 4. Mode switching (`.mode-explorer` / `.mode-studio` + accent tokens)
* [ ] 5. Badge + Pill components
* [ ] 6. Skeleton loading component
* [ ] 7. Empty state component
* [ ] 8. KPI MetricCard (with sparkline)
* [ ] 9. ChartCard wrapper + time range selector pills
* [ ] 10. Copilot panel (Studio only, slide-in)

## Forbidden Patterns (never generate these)

* Purple gradients or aurora/glow hero backgrounds
* Glassmorphism as primary card style
* `filter: blur` on backgrounds (only allowed for locked-metric overlays per spec)
* `Inter`, `Roboto`, `system-ui` as font choices
* Animated gradient borders
* Pie charts (use donut or bar)
* `localStorage` or `sessionStorage` for UI state (use React state, or an existing state library if already present)
* Tailwind arbitrary values  -  use CSS tokens instead
