# SocialLens

SocialLens is a social media account data collection + analytics platform.
MVP focus: **YouTube** (official API, no scraping).

## MVP Goals
- Input a YouTube channel URL/handle/channelId
- Fetch channel + videos + engagement metrics using YouTube Data API
- Store normalized data
- Provide basic analytics endpoints + dashboard

## Repo Structure
- `backend/` API + data ingestion
- `frontend/` dashboard
- `docs/` architecture + notes

## Getting Started

### Backend Development

The backend runs on **port 8081** by default. Use the provided scripts to manage the development server and avoid port conflicts.

#### Start the Backend
```bash
./scripts/dev-up.sh
```

This script will:
- Check if port 8081 is available
- If port is in use, display the conflicting process PID and exit
- Start the Spring Boot backend using Gradle
- Write logs to `/tmp/backend.log`
- Store the process PID in `/tmp/sociallens-backend.pid`
- Display the server URL when ready

**Force mode** (auto-kill conflicting process):
```bash
./scripts/dev-up.sh --force
```

#### Stop the Backend
```bash
./scripts/dev-down.sh
```

This script will:
- Gracefully stop the backend process
- Clean up the PID file
- Preserve logs at `/tmp/backend.log`

#### View Logs
```bash
tail -f /tmp/backend.log
```

#### Troubleshooting

**Port already in use:**
```bash
# Option 1: Use the provided script to stop the backend
./scripts/dev-down.sh

# Option 2: Force kill and start
./scripts/dev-up.sh --force

# Option 3: Manually find and kill the process
lsof -i :8081
kill <PID>
```
