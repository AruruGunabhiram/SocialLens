# SocialLens — Architecture

---

## System Overview

SocialLens is a **pull-based analytics pipeline** built in two tiers:

- **Backend (Spring Boot):** Periodically pulls public YouTube metrics via the YouTube Data API v3, stores daily snapshots in a relational database, and exposes a REST API for the frontend.
- **Frontend (React + TypeScript):** Queries the REST API, validates responses with Zod, caches with TanStack Query, and renders interactive charts and tables.

```
YouTube Data API v3
        │
        ▼
┌──────────────────────────────────────────────────┐
│              Spring Boot (port 8081)             │
│                                                  │
│  DailyRefreshJob (cron 02:30 UTC)                │
│    └─ DailyRefreshWorker (per channel, atomic)   │
│         ├─ YouTubeServiceImpl  (metadata fetch)  │
│         ├─ YouTubeSyncServiceImpl (video sync)   │
│         └─ writeChannelSnapshotIfNeeded()        │
│                                                  │
│  REST Controllers                                │
│    ├─ AnalyticsController                        │
│    ├─ ChannelsController                         │
│    ├─ YouTubeOAuthController                     │
│    └─ JobsController                             │
│                                                  │
│  H2 / PostgreSQL (Flyway migrations)             │
└──────────────────────┬───────────────────────────┘
                       │ HTTP REST
┌──────────────────────▼───────────────────────────┐
│           React Frontend (port 5173)             │
│  TanStack Query → Axios → Zod → React components │
└──────────────────────────────────────────────────┘
```

---

## Component Map

### Backend packages (`com.LogicGraph.sociallens`)

```
controller/
  AnalyticsController            GET  /analytics/**
  ChannelsController             GET  /channels/**
  YouTubeOAuthController         GET  /api/v1/oauth/youtube/**
  JobsController                 POST /api/v1/jobs/**
  YouTubeController              POST /youtube/sync  (channel add / re-sync)
  CreatorIntelligenceController  GET  /creator/**    (partial — not production-ready)

service/
  analytics/
    AnalyticsServiceImpl         Timeseries queries, top videos, upload frequency
  youtube/
    YouTubeServiceImpl           YouTube Data API calls (channel metadata, videos)
    YouTubeSyncServiceImpl       Incremental video sync, snapshot writes
  oauth/
    YouTubeOAuthService          OAuth flow, token exchange, token refresh
    GoogleTokenService           Token introspection helpers
  channel/
    ChannelsServiceImpl          Channel list, channel detail
    ChannelVideosServiceImpl     Paginated video queries
  resolver/
    DefaultChannelResolver       Resolves identifier (UCxxx / @handle / custom URL) → entity
  creator/
    RetentionDiagnosisService    (stub — not production-ready)

jobs/
  DailyRefreshJob                @Scheduled entrypoint
  DailyRefreshWorker             Per-channel atomic refresh logic
  OAuthAnalyticsRefreshJob       Token refresh loop (every 6 hours)
  OAuthStateCleanupJob           Purges expired OAuth state tokens
  ApiCallBudget                  Quota counter per run
  JobProperties                  Config binding (cron, max-channels, etc.)

repository/                      JpaRepository<Entity, Long> for each entity

entity/
  YouTubeChannel                 Channel metadata + refresh cursor
  YouTubeVideo                   Video metadata
  ChannelMetricsSnapshot         Daily channel metrics (one per channel per day)
  VideoMetricsSnapshot           Daily video metrics (one per video per day)
  ConnectedAccount               OAuth tokens per (user, platform)
  OAuthState                     Short-lived CSRF state tokens (10-minute TTL)
  User                           User accounts

exception/
  GlobalExceptionHandler         @RestControllerAdvice → ErrorResponseDto
  NotFoundException              → 404
  RateLimitException             → 429 + Retry-After
  OAuthStateInvalidException     → 400
  TokenRefreshFailedException    → 401
  InsufficientApiQuotaException  → 429 + Retry-After until midnight UTC
```

### Frontend structure (`frontend/src/`)

```
app/
  router.tsx          Lazy-loaded routes (all pages code-split)
  providers.tsx       QueryClient + ErrorBoundary + Toaster
  layout/             AppShell, Sidebar, Topbar

features/
  channels/           ChannelsListPage, ChannelOverviewPage, ChannelVideosPage
  trends/             TrendsPage + fetchTimeSeries + computeInsights + hasSufficientData
  insights/           InsightsPage (partial)

api/
  axiosClient.ts      Base URL + request/response interceptors
  endpoints.ts        All path constants
  schemas.ts          Zod schemas (single source of truth for API shapes)
  types.ts            TypeScript types inferred from Zod schemas
  httpError.ts        Normalises Axios errors, Zod errors, timeouts → HttpError

components/
  common/             MetricCard, ChartCard, DataTable, EmptyState, ErrorState
  charts/             Sparkline, RangePills
  ui/                 shadcn primitives (Radix-based)

styles/
  tokens.css          All CSS variables (colors, fonts, shadows) — no hardcoded values in components
```

---

## Data Model

### Core tables

```
youtube_channel
  id (PK)
  channel_id          TEXT UNIQUE      -- UC... identifier from YouTube
  handle              TEXT             -- @handle or custom URL
  title, description, country, thumbnail_url
  subscriber_count, view_count, video_count   -- Latest values from API
  last_video_sync_at  TIMESTAMP        -- Incremental sync cursor
  last_successful_refresh_at
  last_refresh_status ENUM(NEVER_RUN, SUCCESS, FAILED, PARTIAL)
  last_refresh_error  TEXT
  active              BOOLEAN
  created_at, updated_at

channel_metrics_snapshot
  id (PK)
  channel_id          FK → youtube_channel
  subscriber_count, view_count, video_count
  captured_at         TIMESTAMP        -- Exact moment of capture
  captured_day_utc    DATE             -- UTC date bucket (query key)
  source              ENUM(PUBLIC_API, ANALYTICS_API, ...)
  UNIQUE(channel_id, captured_day_utc)   ← one snapshot per channel per day

youtube_video
  id (PK)
  youtube_channel_id  FK → youtube_channel
  video_id            TEXT UNIQUE
  title, description, published_at, duration, category_id, thumbnail_url, tags
  view_count, like_count, comment_count

video_metrics_snapshot
  id (PK)
  video_id            FK → youtube_video
  view_count, like_count, comment_count
  captured_at, captured_day_utc
  UNIQUE(video_id, captured_day_utc)

connected_accounts
  id (PK)
  user_id             FK → users
  platform            ENUM(YOUTUBE, INSTAGRAM)
  channel_id          TEXT
  access_token, refresh_token
  expires_at          TIMESTAMP
  scopes              TEXT
  status              ENUM(ACTIVE, DISCONNECTED)
  last_refreshed_at, last_analytics_refresh_at
  UNIQUE(user_id, platform)

oauth_states
  id (PK)
  state               TEXT UNIQUE      -- CSRF token
  user_id, used BOOLEAN, expires_at   -- 10-minute TTL

users
  id (PK), email, name, created_at
```

### Snapshot uniqueness guarantee

The `UNIQUE(channel_id, captured_day_utc)` constraint on `channel_metrics_snapshot` is the primary idempotency guarantee. If the daily job is re-run (or triggered manually) on the same UTC day, the duplicate `INSERT` raises a `DataIntegrityViolationException` which `YouTubeSyncServiceImpl.writeChannelSnapshotIfNeeded()` catches and silently ignores — the existing row is preserved. No `SELECT`-before-`INSERT` pattern is used, so there is no race window.

---

## Key Design Decisions

### 1. Snapshot-per-day, not raw event streams

Instead of storing every API response as a timestamped event, metrics are bucketed into a single row per (channel, UTC day). This keeps storage bounded (O(channels × days)) and makes timeseries queries trivial — one row per date point, no aggregation needed at read time.

**Trade-off:** Intra-day changes are not visible. If a video goes viral mid-day, the snapshot will not reflect it until the next run.

### 2. `captured_at` (Instant) vs `captured_day_utc` (LocalDate)

Every snapshot stores both an exact `Instant` and a `LocalDate`. The date bucket is the join key for timeseries; the exact timestamp is for auditability. Separating the two makes date-range queries index-friendly without timezone arithmetic at query time, and makes the `UNIQUE` constraint straightforward.

### 3. Identifier resolution layer

`DefaultChannelResolver` translates any of three identifier forms (YouTube channel ID `UCxxx`, `@handle`, custom URL) into a `YouTubeChannel` entity. This keeps controller code clean and centralises resolution logic. The `by-id` endpoint family bypasses the resolver entirely once the frontend has a `channelDbId` from the channel list.

### 4. Two endpoint families

- `/analytics/*?identifier=` — resolves identifier first, then queries (used for ad-hoc lookup)
- `/analytics/*/by-id?channelDbId=` — uses internal database ID directly (used by the frontend after navigation)

The `by-id` family avoids a redundant resolution round-trip once the user has navigated to a channel page.

### 5. API call budget per run

`ApiCallBudget` is a simple counter scoped to one job run. Every YouTube API call decrements it; `InsufficientApiQuotaException` is raised at zero. This prevents a runaway job from exhausting the daily YouTube API quota (10,000 units/day on the free tier). The budget is configurable via `sociallens.jobs.daily-refresh.max-api-calls-per-run`.

### 6. All-or-nothing channel refresh

`DailyRefreshWorker.refreshOneChannel()` runs in `@Transactional(propagation = REQUIRES_NEW)`. The full refresh — metadata update, video sync, snapshot writes, cursor advance — either succeeds and commits, or rolls back entirely and sets `last_refresh_status = FAILED`. This prevents partial writes where the cursor advances but snapshots were not written.

### 7. Zod at the API boundary

All API responses pass through Zod schemas before reaching any React component. If parsing fails, `httpError.ts` converts the `ZodError` into an `HttpError` with message "Unsupported response format" — not a raw schema dump. TanStack Query surfaces this as an error state rendered by `ErrorState`. A backend contract change is immediately visible as an explicit error rather than silently producing empty charts or `undefined` renders.

---

## Request Lifecycle

### Timeseries chart load (frontend → backend)

```
1. User opens /channels/42/trends

2. TrendsPage mounts → useTimeSeries(42, 'VIEWS', 30) called

3. TanStack Query checks cache: miss → calls fetchTimeSeries()

4. fetchTimeSeries() → GET /analytics/timeseries/by-id
                            ?channelDbId=42&metric=VIEWS&rangeDays=30

5. AnalyticsController.getTimeSeriesById()
     └─ AnalyticsServiceImpl.getChannelTimeSeriesById(42, "VIEWS", 30)
          ├─ cutoff = LocalDate.now(ZoneOffset.UTC).minusDays(29)
          │          [today minus 29 = 30-day inclusive window]
          ├─ snapshots = ChannelMetricsSnapshotRepository
          │                .findByChannelIdSince(42, cutoff)
          ├─ groupAndMapToDaily(snapshots, "VIEWS")
          │    └─ groups by capturedDayUtc, picks latest per day
          │       maps subscriber/view/videoCount → unified "value"
          └─ returns TimeSeriesResponseDto
               { channelDbId, channelId, metric, rangeDays,
                 points: [{ date: "YYYY-MM-DD", value: 123456 }, ...] }

6. Axios receives response → Zod parses with TimeSeriesResponseSchema
     └─ on parse failure: throws HttpError("Unsupported response format")

7. TanStack Query caches result (staleTime: 5 min)

8. TrendsPage renders:
     ├─ hasSufficientData(points) — needs ≥2 distinct YYYY-MM-DD dates
     ├─ computeInsights(points)   — peak, avg, trend direction
     └─ Recharts LineChart        — x: date, y: value
```

### Daily refresh job

```
1. DailyRefreshJob.runDailyRefresh() fires at 02:30 UTC

2. Loads up to max-channels-per-run (default 25) active channels from DB

3. For each channel:
   DailyRefreshWorker.refreshOneChannel(channelDbId)
     ├─ putIfAbsent on ConcurrentHashMap — skip if already running
     ├─ YouTubeServiceImpl.fetchChannel(channelId)       [1 API call]
     ├─ Update YouTubeChannel entity metadata
     ├─ YouTubeSyncServiceImpl.syncIncrementalVideos()   [N calls, since cursor]
     ├─ YouTubeSyncServiceImpl.enrichVideoMetadata()     [M calls]
     ├─ writeChannelSnapshotIfNeeded(today)              [DB insert, UNIQUE-safe]
     ├─ writeVideoSnapshotsIfNeeded(today)
     ├─ Advance lastVideoSyncAt cursor
     ├─ Set lastRefreshStatus = SUCCESS
     └─ Commit (REQUIRES_NEW transaction)
   On exception: rollback, set FAILED + lastRefreshError, log error

4. Log totals: processed N, ok K, failed F
```

---

## Concurrency & Safety

### Snapshot idempotency

`writeChannelSnapshotIfNeeded()` catches `DataIntegrityViolationException` from the unique constraint violation. The method is safe to call multiple times on the same UTC day — the first call writes, subsequent calls are silent no-ops. No `SELECT`-before-`INSERT` is needed, so there is no race window between check and write.

### Job concurrency guard

`DailyRefreshWorker` maintains a `ConcurrentHashMap<Long, Instant>` of in-progress channel IDs. If a manual refresh (via `JobsController`) is triggered while the daily job is already refreshing the same channel, `putIfAbsent` returns a non-null value and the second call is skipped. The map entry is removed in a `finally` block to guarantee cleanup even on exception.

### Transactional isolation

Each channel refresh uses `Propagation.REQUIRES_NEW`, so one channel's failure does not affect others in the same job run. The outer `runDailyRefresh()` loop is not itself transactional — it collects results from N independent transactions.

**Note:** The concurrency guard is in-memory only. In a multi-instance deployment, it would need to be replaced with a distributed lock (e.g., a `jobs_lock` table row with `SELECT FOR UPDATE`).

---

## OAuth Flow

```
Frontend                   Backend                          Google
   │                          │                               │
   │  GET /oauth/youtube/start?userId=1                       │
   │─────────────────────────►│                               │
   │                          │ generateState(), save to DB   │
   │  { authUrl: "https://accounts.google.com/o/oauth2/..." } │
   │◄─────────────────────────│                               │
   │                          │                               │
   │  redirect user to authUrl────────────────────────────────►
   │                          │                               │
   │                          │       user grants consent     │
   │                          │◄──────────────────────────────│
   │                          │  ?code=...&state=...          │
   │                          │                               │
   │                          │ validate state (DB lookup)    │
   │                          │                               │
   │                          │  POST /token (code exchange)─►│
   │                          │◄──────────────────────────────│
   │                          │  { access_token, refresh_token, expires_in }
   │                          │                               │
   │                          │  GET /youtube/v3/channels────►│
   │                          │◄──────────────────────────────│
   │                          │  { channelId }                │
   │                          │                               │
   │                          │ upsert ConnectedAccount in DB │
   │  redirect → success page │                               │
   │◄─────────────────────────│                               │
```

**OAuth scopes requested:**
- `https://www.googleapis.com/auth/yt-analytics.readonly`
- `https://www.googleapis.com/auth/youtube.readonly`

**Token refresh logic (`YouTubeOAuthService.getValidAccessToken`):**
1. Check `expiresAt` — if more than 60 seconds away, return stored `accessToken`
2. Otherwise POST to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`
3. Update `accessToken` and `expiresAt` in DB
4. If Google returns a new `refreshToken`, overwrite it; otherwise keep the existing one (Google typically omits it on refresh to preserve the original)
5. If refresh fails: throw `TokenRefreshFailedException` (401)

**State token TTL:** 600 seconds. `OAuthStateCleanupJob` purges expired states.

**Current limitation:** The frontend has no UI page to initiate this flow. The `/start` endpoint must be called manually. All backend plumbing is complete.

---

## Scheduling Architecture

```
┌─────────────────────────────────────────────────┐
│          Spring @Scheduled (UTC timezone)       │
│                                                 │
│  DailyRefreshJob          cron: 0 30 2 * * *    │
│  (02:30 UTC daily)        max 25 channels/run   │
│                           max 500 API calls/run │
│                                                 │
│  OAuthAnalyticsRefreshJob cron: 0 0 */6 * * *   │
│  (every 6 hours)          max 200 accounts/run  │
│                                                 │
│  OAuthStateCleanupJob     purges expired states │
└─────────────────────────────────────────────────┘
```

All jobs are **disabled by default** (`sociallens.jobs.enabled=false`). Set `sociallens.jobs.enabled=true` to activate the scheduled runs.

Configurable properties (bound via `JobProperties`):

```properties
sociallens.jobs.enabled=false
sociallens.jobs.daily-refresh.cron=0 30 2 * * *
sociallens.jobs.daily-refresh.max-channels-per-run=25
sociallens.jobs.daily-refresh.max-videos-per-channel-per-run=400
sociallens.jobs.daily-refresh.max-api-calls-per-run=500
sociallens.jobs.oauth-refresh.cron=0 0 */6 * * *
sociallens.jobs.oauth-refresh.max-accounts-per-run=200
```

---

## Frontend State Management

SocialLens uses **TanStack Query v5** as the sole server-state manager. There is no Redux, Zustand, or React Context used for data fetching.

### Query key conventions

```typescript
['channels']                                    // channel list
['channel', channelDbId]                        // channel overview
['timeseries', channelDbId, metric, rangeDays]  // trend chart data
['videos', channelDbId, page, size, sortBy]     // paginated video table
```

### Data flow

```
API layer (axiosClient + Zod parse)
  └─ Feature-level query hook (useTimeSeries, useChannelAnalytics, ...)
       └─ TanStack Query (cache, background refetch, error state)
            └─ Page component (reads from cache, renders)
```

### Error handling

`httpError.ts` normalises all errors (Axios 4xx/5xx, network timeout, Zod parse failure) into a consistent `HttpError` shape before they reach any component. TanStack Query surfaces these via its `error` state. Components use `ErrorState` for expected errors and React's `ErrorBoundary` for unexpected crashes at the layout level.

### UI-only state

Metric selector, range selector, and series-mode toggle (total vs. daily change) on TrendsPage are plain `useState` — local to the component, not persisted to URL or storage. `localStorage` and `sessionStorage` are explicitly forbidden by project rules.

### Lazy loading

All route-level components are wrapped in `React.lazy()` with `Suspense`. Each page is a separate bundle chunk. Route definitions live in `app/router.tsx`.
