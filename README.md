# SocialLens

A YouTube analytics platform that ingests channel and video metrics via the YouTube Data API v3, stores daily snapshots, and presents an interactive dashboard for trend analysis and channel insights.

> Built with Spring Boot (backend) + React + TypeScript (frontend).

---

## What It Does

SocialLens lets you:

- **Track channels** — look up any public YouTube channel by ID, handle, or custom URL
- **Snapshot metrics daily** — subscriber count, view count, and video count are stored once per day per channel via a scheduled job
- **Explore trends** — visualise timeseries data (7 / 30 / 90-day range) with daily-change or cumulative modes
- **Browse videos** — paginated table of synced videos with per-video stats (views, likes, comments)
- **Connect via OAuth** — link a Google/YouTube account to enable analytics-scope data (token refresh handled automatically)
- **Trigger manual refreshes** — hit the jobs API to refresh a specific channel on demand

---

## Running the app

Start the backend and frontend (see Getting Started below), then open `http://localhost:5173`.

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Framework | Spring Boot 3.3.0, Java 17 |
| Data | Spring Data JPA / Hibernate, Flyway, H2 (dev) / PostgreSQL (prod) |
| API integration | YouTube Data API v3 (REST, key-based) |
| OAuth | Google OAuth 2.0 — authorization code flow |
| Scheduling | Spring `@Scheduled` with configurable CRON expressions |
| Build | Gradle |
| Testing | JUnit 5, Mockito, `@AutoConfigureMockMvc` |
| Docs | springdoc-openapi (Swagger UI at `/swagger-ui.html`) |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (strict mode), Vite |
| Server state | TanStack Query v5 |
| HTTP | Axios |
| Validation | Zod (schemas → inferred TypeScript types) |
| Charts | Recharts |
| UI | shadcn/ui (Radix primitives) + Tailwind CSS + CSS variable token system |
| Motion | Framer Motion (page/panel transitions only) |
| Icons | Lucide React |
| Fonts | Syne (display) + Instrument Sans (body) + DM Mono (all numerics) |
| Testing | Vitest + @testing-library/react |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Frontend                          │
│   TanStack Query → Axios → Zod validation → Component render   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (localhost:8081)
┌──────────────────────────▼──────────────────────────────────────┐
│                      Spring Boot API                            │
│  Controllers → Services → Repositories → JPA entities          │
│  AnalyticsController  ChannelsController  YouTubeOAuthController│
│  JobsController                                                 │
└────────────┬──────────────────────────────┬─────────────────────┘
             │ YouTube Data API v3           │ Google OAuth 2.0
             │                              │
┌────────────▼────────────┐    ┌────────────▼─────────────────────┐
│  H2 / PostgreSQL        │    │  Google APIs (token exchange,     │
│  Flyway-managed schema  │    │  channels.list, videos.list)      │
└─────────────────────────┘    └──────────────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for the full design.

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- A [YouTube Data API v3 key](https://console.cloud.google.com/)
- (Optional, for OAuth) A Google OAuth 2.0 client configured with the redirect URI below

### 1. Clone

```bash
git clone https://github.com/your-username/sociallens.git
cd sociallens
```

### 2. Configure environment variables

Create `backend/.env` (or export in your shell):

```env
YOUTUBE_API_KEY=AIza...
GOOGLE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8081/api/v1/oauth/youtube/callback

# Optional overrides
SERVER_PORT=8081
```

### 3. Start the backend

```bash
cd backend
./gradlew bootRun
```

The API starts on **port 8081**. H2 console is available at `http://localhost:8081/h2-console`.

**Start on an alternate port:**
```bash
SERVER_PORT=8082 ./gradlew bootRun
```

**View logs:**
```bash
tail -f /tmp/backend.log
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on **port 5173**.

### 5. Sync a channel

```bash
curl -X POST "http://localhost:8081/api/v1/youtube/sync" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "@mkbhd"}'
```

Then open `http://localhost:5173` to see the dashboard.

---

## Key Features

### Daily Snapshot Strategy

A `DailyRefreshJob` (cron: `0 15 3 * * *`, 3:15 AM server time, configurable via `sociallens.jobs.daily-refresh.cron`) fetches public metrics for every active channel and writes a `channel_metrics_snapshot` row per day. A `UNIQUE(channel_id, captured_day_utc)` constraint enforces exactly one snapshot per channel per UTC day — duplicate insertions are caught as `DataIntegrityViolationException` (409) and silently ignored, making the job naturally idempotent.

### Timeseries Analytics

- Query: `GET /analytics/timeseries/by-id?channelDbId={id}&metric=VIEWS&rangeDays=30`
- Range calculation: `today − (rangeDays − 1)` so a 30-day range always includes today
- Frontend: TrendsPage with metric / range / mode selectors, Recharts `LineChart`, and insight cards (peak, avg, trend direction)

### OAuth & Token Refresh

Users connect their YouTube account via Google OAuth 2.0 (authorization code flow). The `YouTubeOAuthService` stores the refresh token in `connected_accounts` and auto-refreshes the access token within 60 seconds of expiry. A background `OAuthAnalyticsRefreshJob` (every 6 hours) proactively refreshes tokens for all active accounts.

### API Budget Guard

Each daily refresh run is allotted a configurable quota of YouTube API calls (`max-api-calls-per-run`, default 500). The `ApiCallBudget` object tracks consumption and raises `InsufficientApiQuotaException` if the budget is exhausted, preventing quota overruns. The 429 response includes a `Retry-After` header calculated as seconds until YouTube quota reset at midnight Pacific Time.

### Incremental Video Sync

Videos are fetched via the channel's uploads playlist with a `lastVideoSyncAt` cursor stored on `YouTubeChannel`. Each run only fetches videos published after the cursor, keeping API cost proportional to actual activity rather than total channel history.

---

## API Reference

Base URL: `http://localhost:8081`

Full interactive docs: `http://localhost:8081/swagger-ui.html`

### Channels

| Method | Path | Description |
|---|---|---|
| `GET` | `/channels` | List all tracked channels |
| `GET` | `/channels/{channelDbId}` | Channel detail + metadata |
| `GET` | `/channels/{channelDbId}/videos?page=0&size=20` | Paginated videos |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/analytics/channel/by-id?channelDbId=` | Current metrics (subs, views, videos) |
| `GET` | `/analytics/timeseries/by-id?channelDbId=&metric=VIEWS&rangeDays=30` | Timeseries points (`metric`: `VIEWS` \| `SUBSCRIBERS` \| `UPLOADS`) |
| `GET` | `/analytics/videos/by-id?channelDbId=&limit=10` | Top videos by view count |
| `GET` | `/analytics/upload-frequency/by-id?channelDbId=&weeks=12` | Upload frequency breakdown |

> Identifier-based variants (`?identifier=UCxxx` or `?identifier=@handle`) are also supported for all analytics endpoints.

### OAuth

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/oauth/youtube/start?userId=` | Returns Google OAuth consent URL |
| `GET` | `/api/v1/oauth/youtube/callback?code=&state=` | Exchange code for tokens (Google redirects here) |

### Jobs

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/jobs/refresh/channel?channelDbId=` | Trigger manual channel refresh |

### YouTube (channel add / re-sync)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/youtube/sync` | Add or re-sync a channel by identifier |

---

## Project Structure

```
sociallens/
├── backend/
│   ├── src/main/java/com/LogicGraph/sociallens/
│   │   ├── SocialLensApplication.java
│   │   ├── config/              # SecurityConfig, CorsConfig, YouTubeApiConfig, SchedulerConfig
│   │   ├── controller/          # AnalyticsController, ChannelsController, YouTubeOAuthController
│   │   │                        # JobsController, YouTubeController, CreatorIntelligenceController
│   │   ├── service/
│   │   │   ├── analytics/       # AnalyticsServiceImpl
│   │   │   ├── youtube/         # YouTubeServiceImpl, YouTubeSyncServiceImpl
│   │   │   ├── oauth/           # YouTubeOAuthService, GoogleTokenService
│   │   │   ├── channel/         # ChannelsServiceImpl, ChannelVideosServiceImpl
│   │   │   ├── resolver/        # DefaultChannelResolver
│   │   │   └── creator/         # RetentionDiagnosisService (partial — not production-ready)
│   │   ├── repository/          # JPA repositories (JpaRepository<Entity, Long>)
│   │   ├── entity/              # YouTubeChannel, YouTubeVideo, ChannelMetricsSnapshot,
│   │   │                        # VideoMetricsSnapshot, ConnectedAccount, OAuthState, User
│   │   ├── dto/                 # Organised by domain: analytics/, channels/, oauth/, error/, ...
│   │   ├── jobs/                # DailyRefreshJob, DailyRefreshWorker, OAuthAnalyticsRefreshJob,
│   │   │                        # OAuthStateCleanupJob, ApiCallBudget, JobProperties
│   │   ├── enums/               # Platform, RefreshStatus, DataSource, ConnectedAccountStatus
│   │   └── exception/           # Domain exceptions + GlobalExceptionHandler
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/        # V1__baseline.sql (Flyway)
│   └── src/test/                # Controller, service, and repository tests
│
└── frontend/
    └── src/
        ├── api/                 # axiosClient, endpoints, schemas (Zod), types, httpError
        ├── app/                 # App.tsx, router.tsx, providers.tsx, queryClient.ts
        │   └── layout/          # AppShell, Sidebar, Topbar
        ├── components/
        │   ├── ui/              # shadcn primitives (Radix-based)
        │   ├── common/          # MetricCard, ChartCard, DataTable, EmptyState, ErrorState
        │   └── charts/          # Sparkline, RangePills
        ├── features/
        │   ├── channels/        # ChannelsListPage, ChannelOverviewPage, ChannelVideosPage
        │   ├── trends/          # TrendsPage, fetchTimeSeries, computeInsights, hasSufficientData
        │   ├── insights/        # InsightsPage (partial)
        │   └── videos/          # VideosPage
        ├── lib/                 # format.ts, utils.ts, toast.ts
        ├── pages/               # DashboardPage, NotFoundPage
        └── styles/              # tokens.css, base.css, animations.css
```

---

## Known Limitations

These are honest limitations to be aware of before production use:

1. **No authentication on API routes.** All endpoints are currently open (`permitAll`). The `User` entity and `ConnectedAccount` storage exist, but JWT enforcement is not implemented. Anyone who can reach port 8081 can read all data.

2. **Single-user model.** The database supports users, but the UI has no login/signup flow. OAuth linkage requires hitting the start URL with a hardcoded `userId=1`.

3. **H2 file database for development.** The default data source is file-backed H2. Data survives restarts but is not suitable for multi-instance deployments. Switch to PostgreSQL by configuring `spring.datasource.*`.

4. **YouTube public API only (no private analytics).** Unless a channel owner connects via OAuth, only publicly available metrics (subscriber count, view count, video count) are tracked. YouTube Analytics API data (watch time, revenue, traffic sources) requires OAuth with the channel owner's consent — the backend infrastructure exists but the frontend UI to trigger this flow is not built.

5. **No per-video timeseries in the UI.** `video_metrics_snapshot` rows are written daily, but there is no frontend page rendering per-video trend charts.

6. **Instagram is a stub.** `Platform.INSTAGRAM` is defined in the enum; no API integration or OAuth flow exists.

7. **Creator Intelligence has no frontend UI.** `RetentionDiagnosisServiceImpl` can detect audience retention drops, classify them by video position (hook / pacing / outro / structure), and return severity-graded diagnoses with recommendations. The endpoint is live at `POST /creator/retention/diagnosis` but there is no frontend page for it.

8. **Jobs are disabled by default.** `sociallens.jobs.enabled=false` by default. Snapshots accumulate only if the cron is enabled or a manual refresh is triggered via the jobs API.

9. **No HTTPS or production hardening.** No TLS config, no secret rotation, and OAuth tokens are stored as plaintext in the database.

---

## Roadmap

- [ ] JWT auth + user login/signup flow
- [ ] Frontend UI for OAuth connect/disconnect
- [ ] Per-video trend charts
- [ ] Export analytics (CSV)
- [ ] YouTube Analytics API integration (watch time, traffic sources)
- [ ] Anomaly detection on metric drops
- [ ] Multi-user / team access
- [ ] Instagram integration
- [ ] Dockerized deployment with PostgreSQL

---

## License

MIT
