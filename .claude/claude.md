# SocialLens Frontend — Claude Code Rules

> Read [docs/UI_THEME_SPEC.md](../docs/UI_THEME_SPEC.md) before touching any component or style.

---

## Stack (no new libraries — explain before adding)

- Vite + React 18 + TypeScript strict
- Tailwind CSS — layout/spacing/sizing/flex/grid only; **no arbitrary values** (`text-[13px]` forbidden)
- shadcn/ui — import from `@/components/ui/*`
- TanStack Query v5 for all server state
- Recharts for charts; Framer Motion for panel/page animations only
- Lucide React + custom SVGs in `src/assets/icons/`; React Router v6

## Non-Negotiables

- **Zero hardcoded hex values** in components — `tokens.css` CSS variables only.
- **Zero emojis** anywhere in UI, copy, or placeholder text.
- **Fonts**: Syne (display) · Instrument Sans (body) · DM Mono (all numbers + metrics).
- **DM Mono + `font-variant-numeric: tabular-nums`** on every numeric/metric value.
- Colors, typography, shadows, and borders from CSS tokens — never from Tailwind palette.
- Do not refactor files unrelated to the current task.
- Do not rewrite working components to "clean them up" unless explicitly asked.

## Workflow (every task)

1. State the exact files to create or modify — nothing else.
2. Implement the smallest diff that satisfies the criteria.
3. Run: `npm run typecheck && npm run lint`
4. Summarize: what changed, what to verify in browser.

## Forbidden Patterns

- Purple gradients or aurora/glow hero backgrounds
- Glassmorphism as primary card style
- `filter: blur` on backgrounds (only for locked-metric overlays per spec)
- `Inter`, `Roboto`, `system-ui` fonts
- Animated gradient borders
- Pie charts (use donut or bar)
- `localStorage`/`sessionStorage` for UI state (use React state or existing state library)
- Tailwind arbitrary values — use CSS tokens
