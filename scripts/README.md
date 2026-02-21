# Development Scripts

Scripts for managing the SocialLens backend development server.

## Quick Reference

```bash
# Start backend
./scripts/dev-up.sh

# Start backend and auto-kill port conflicts
./scripts/dev-up.sh --force

# Stop backend
./scripts/dev-down.sh

# View logs
tail -f /tmp/backend.log
```

## Files

- **dev-up.sh** - Starts the Spring Boot backend on port 8081
- **dev-down.sh** - Stops the backend gracefully

## How It Works

### dev-up.sh

1. Checks if port 8081 is available using `lsof`
2. If port is in use:
   - Without `--force`: Shows PID and exits with instructions
   - With `--force`: Automatically kills the conflicting process
3. Starts backend with `./gradlew bootRun` in background
4. Writes logs to `/tmp/backend.log`
5. Stores PID in `/tmp/sociallens-backend.pid`
6. Waits up to 60 seconds for server to respond
7. Displays server URL when ready

### dev-down.sh

1. Reads PID from `/tmp/sociallens-backend.pid`
2. Sends SIGTERM for graceful shutdown
3. Waits up to 15 seconds
4. If process doesn't stop, sends SIGKILL
5. Cleans up PID file
6. Preserves logs

## Requirements

- macOS (uses `lsof` for port detection)
- Bash or Zsh
- Java 17+ (for Spring Boot)
- Gradle (via gradlew)

## Troubleshooting

**"Port 8081 is already in use"**
- Check if it's a previous SocialLens instance: `./scripts/dev-down.sh`
- Force kill and restart: `./scripts/dev-up.sh --force`
- Manually find process: `lsof -i :8081`

**"Backend process died unexpectedly"**
- Check logs: `cat /tmp/backend.log`
- Verify environment variables are set (see backend/.env)
- Check database connectivity

**"Server did not start within 60 seconds"**
- Process is running but port not responding
- Check logs for errors: `tail -f /tmp/backend.log`
- May need longer startup time (check if dependencies are downloading)

## Environment Variables

The backend requires these environment variables (typically in `backend/.env`):
- `YOUTUBE_API_KEY`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

See `backend/.env` for configuration.
