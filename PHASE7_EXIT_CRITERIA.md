# Phase 7 — Exit Criteria Evidence Log

**Branch:** `frontend` | **Reviewer:** | **Date:** | **Build SHA:**

> Fill the **Evidence** column with a file path, curl output snippet, screenshot name, or Vitest run line.
> Mark ✅ when done, ⚠️ when conditionally accepted (note risk), ❌ when blocking.

---

## 1. Routing

| #   | Requirement                                                      | Status | Evidence | Notes / Risks                   |
| --- | ---------------------------------------------------------------- | ------ | -------- | ------------------------------- |
| R1  | `/` redirects to `/channels`                                     |        |          |                                 |
| R2  | `/channels` renders `ChannelsListPage`                           |        |          |                                 |
| R3  | `/channels/:channelDbId` renders `ChannelOverviewPage`           |        |          |                                 |
| R4  | `/channels/:channelDbId/videos` renders `ChannelVideosPage`      |        |          |                                 |
| R5  | `/channels/:channelDbId/trends` renders `TrendsPage`             |        |          |                                 |
| R6  | `/channels/:channelDbId/insights` renders `InsightsPage`         |        |          |                                 |
| R7  | Legacy `/channel` (search-param) still resolves without 404      |        |          | Backward-compat route           |
| R8  | Unknown route renders `NotFoundPage`                             |        |          |                                 |
| R9  | Deep-link reload (e.g. `/channels/3/trends`) works in prod build |        |          | Vite base path / nginx fallback |

---

## 2. Data Fetching & Caching

| #   | Requirement                                                                             | Status | Evidence                                   | Notes / Risks |
| --- | --------------------------------------------------------------------------------------- | ------ | ------------------------------------------ | ------------- |
| D1  | Channel list loads from `GET /channels`                                                 |        | `curl /channels` or Network tab            |               |
| D2  | Channel overview loads from `GET /analytics/channel/by-id?channelDbId=`                 |        |                                            |               |
| D3  | Videos page loads from `GET /channels/:id/videos` with pagination params                |        |                                            |               |
| D4  | Timeseries loads from `GET /analytics/timeseries/by-id?channelDbId=&metric=&rangeDays=` |        |                                            |               |
| D5  | TanStack Query stale-time prevents redundant refetches on tab switch                    |        | DevTools "fresh" indicator                 |               |
| D6  | Query keys are stable (no accidental cache busting on re-render)                        |        | `src/features/*/hooks.ts` query key arrays |               |
| D7  | Changing metric or rangeDays on TrendsPage triggers a new fetch                         |        | Network tab                                |               |

---

## 3. Validation (Zod)

| #   | Requirement                                                                                          | Status | Evidence                                             | Notes / Risks    |
| --- | ---------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- | ---------------- |
| V1  | `ChannelItemSchema` parses real `/channels` response without error                                   |        | `httpError.test.ts` + manual                         |                  |
| V2  | `TimeSeriesResponseSchema` accepts `{ points: [{date, value}] }` contract                            |        | `schemas.ts` + Network tab                           |                  |
| V3  | Schema parse failure surfaces as `PARSE_ERROR` / "Unsupported response format" (not raw Zod message) |        | `httpError.test.ts` — ZodError suite (19 tests pass) | Fixed in Phase 7 |
| V4  | `VideosPageResponseSchema` validates pagination meta fields                                          |        |                                                      |                  |

---

## 4. Error Handling

| #   | Requirement                                                             | Status | Evidence                                     | Notes / Risks       |
| --- | ----------------------------------------------------------------------- | ------ | -------------------------------------------- | ------------------- |
| E1  | Axios 404 → `status=404`, backend `message` preserved                   |        | `httpError.test.ts` — axios 404 suite        |                     |
| E2  | Axios 429 → `status=429`, rate-limit message preserved, `HTTP_429` code |        | `httpError.test.ts` — axios 429 suite        |                     |
| E3  | `x-request-id` header captured on any error                             |        | `httpError.test.ts` R4                       | Aids support triage |
| E4  | ZodError does NOT leak raw `.issues` array to UI                        |        | `httpError.test.ts` — "no raw ZodError leak" | Bug fixed Phase 7   |
| E5  | Network timeout surfaces user-friendly message (not "undefined")        |        | Manual: disable network in DevTools          |                     |
| E6  | Error boundary present at AppShell level                                |        | `src/app/`                                   |                     |
| E7  | Retry button re-triggers query on error pages                           |        | Manual                                       |                     |

---

## 5. Empty & Loading States

| #   | Requirement                                                                  | Status | Evidence                              | Notes / Risks |
| --- | ---------------------------------------------------------------------------- | ------ | ------------------------------------- | ------------- |
| L1  | `PageFallback` skeleton shown on lazy-route load                             |        | `AppShell.tsx:46`                     |               |
| L2  | `StatCard` shows `<Skeleton>` when `loading=true` and hides value            |        | `StatCard.test.tsx` — loading suite   |               |
| L3  | `DataTable` shows "No data available" (or custom message) on empty `data=[]` |        | `DataTable.test.tsx` — empty state    |               |
| L4  | TrendsPage shows empty state when `points.length < 2`                        |        | `hasSufficientData()` in `utils.ts`   |               |
| L5  | ChannelsListPage empty state shows when no channels exist                    |        | Manual or `ChannelsListPage.test.tsx` |               |
| L6  | No layout shift between skeleton → content                                   |        | Visual / LCP trace                    |               |

---

## 6. Manual Refresh Flow

| #   | Requirement                                                      | Status | Evidence                                    | Notes / Risks               |
| --- | ---------------------------------------------------------------- | ------ | ------------------------------------------- | --------------------------- |
| RF1 | "Refresh" button calls `POST /jobs/refresh/channel?channelDbId=` |        | Network tab — verify query param (not body) | Param name is `channelDbId` |
| RF2 | In-flight refresh disables the button (no double-submit)         |        | Manual                                      |                             |
| RF3 | Successful refresh invalidates channel + analytics query cache   |        | DevTools — observe refetch                  |                             |
| RF4 | Refresh error shows toast / error message (not silent fail)      |        | Manual — stub 500                           |                             |

---

## 7. Charts & Tables

| #   | Requirement                                                     | Status | Evidence                               | Notes / Risks |
| --- | --------------------------------------------------------------- | ------ | -------------------------------------- | ------------- |
| CT1 | Timeseries chart renders with ≥2 distinct `YYYY-MM-DD` points   |        | `hasSufficientData()` check            |               |
| CT2 | Chart X-axis dates are in ascending order                       |        | `fetchTimeSeries` sort guard           |               |
| CT3 | Metric selector (VIEWS / SUBSCRIBERS / UPLOADS) switches series |        | Manual                                 |               |
| CT4 | Range selector (7 / 30 / 90 days) changes `rangeDays` param     |        | Network tab                            |               |
| CT5 | `DataTable` renders correct column count and row count          |        | `DataTable.test.tsx` — row count test  |               |
| CT6 | Videos table pagination: page change fetches next page          |        | Network tab — `page=` param increments |               |
| CT7 | Tooltip on chart hover shows formatted value (not raw number)   |        | Manual                                 |               |

---

## 8. Performance

| #   | Requirement                                                                 | Status | Evidence                               | Notes / Risks     |
| --- | --------------------------------------------------------------------------- | ------ | -------------------------------------- | ----------------- |
| P1  | Prod bundle JS < 500 kB gzip (main chunk)                                   |        | `npm run build` → `dist/` sizes        | Recharts is large |
| P2  | Route chunks lazy-loaded (each page is a separate chunk)                    |        | `router.tsx` — all routes use `lazy()` |                   |
| P3  | LCP < 2.5 s on `/channels` with local backend                               |        | Lighthouse / WebVitals log             |                   |
| P4  | No waterfall: channel list and analytics fetched in parallel where possible |        | Network tab — timing                   |                   |

---

## 9. Accessibility

| #   | Requirement                                                                         | Status | Evidence                                      | Notes / Risks |
| --- | ----------------------------------------------------------------------------------- | ------ | --------------------------------------------- | ------------- |
| A1  | All interactive controls reachable by keyboard (Tab / Enter / Space)                |        | Manual                                        |               |
| A2  | `<table>` uses semantic `<thead>` / `<th>` / `<td>` — no ARIA role overrides needed |        | `DataTable.tsx:40-60`                         |               |
| A3  | `StatCard` icon has accessible label when meaningful                                |        | `StatCard.test.tsx` — icon test               |               |
| A4  | `StatCard` description `aria-label` is `{label}-description`                        |        | `StatCard.tsx:38`                             |               |
| A5  | Sidebar nav links have descriptive text (not icon-only)                             |        | `Sidebar.tsx`                                 |               |
| A6  | `prefers-reduced-motion` respected (Framer Motion `MotionConfig`)                   |        | `AppShell.tsx:36` + `ReduceMotionContext.tsx` |               |
| A7  | Color contrast ≥ 4.5:1 on body text                                                 |        | Lighthouse accessibility score                |               |
| A8  | Page title updates on route change                                                  |        | Manual — check browser tab                    |               |

---

## Sign-off

| Role          | Name | Date | Decision       |
| ------------- | ---- | ---- | -------------- |
| Frontend Lead |      |      | ☐ Go / ☐ No-Go |
| QA            |      |      | ☐ Go / ☐ No-Go |
| Product       |      |      | ☐ Go / ☐ No-Go |

**Blocking items before merge to `main`:**

- [ ] _(list any ❌ items here)_

**Accepted risks / deferred to Phase 8:**

- [ ] _(list any ⚠️ items here)_
