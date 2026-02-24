#!/usr/bin/env bash

set -euo pipefail

PID_FILE="/tmp/sociallens-backend.pid"
LOG_FILE="/tmp/backend.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping SocialLens Backend...${NC}"

if [ ! -f "$PID_FILE" ]; then
  echo -e "${YELLOW}No PID file found at $PID_FILE${NC}"
  echo "Backend may not be running or was started manually."
  exit 1
fi

PID=$(cat "$PID_FILE")

if ! ps -p "$PID" > /dev/null 2>&1; then
  echo -e "${YELLOW}Process $PID is not running.${NC}"
  echo "Cleaning up PID file..."
  rm -f "$PID_FILE"
  exit 0
fi

PROCESS_INFO=$(ps -p "$PID" -o command= 2>/dev/null || echo "unknown")
echo "Found process:"
echo "  PID: $PID"
echo "  Command: $PROCESS_INFO"
echo ""

# Try graceful shutdown first
echo "Sending SIGTERM (graceful shutdown)..."
kill "$PID" 2>/dev/null || true

# Wait for up to 15 seconds for graceful shutdown
WAITED=0
MAX_WAIT=15
echo -n "Waiting for graceful shutdown"
while [ $WAITED -lt $MAX_WAIT ]; do
  if ! ps -p "$PID" > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}Backend stopped successfully.${NC}"
    rm -f "$PID_FILE"
    exit 0
  fi
  echo -n "."
  sleep 1
  WAITED=$((WAITED + 1))
done

echo ""
echo -e "${YELLOW}Process did not stop gracefully. Forcing shutdown...${NC}"
kill -9 "$PID" 2>/dev/null || true
sleep 1

if ps -p "$PID" > /dev/null 2>&1; then
  echo -e "${RED}Failed to stop process $PID${NC}"
  echo "You may need to kill it manually: kill -9 $PID"
  exit 1
fi

echo -e "${GREEN}Backend stopped (forced).${NC}"
rm -f "$PID_FILE"

echo ""
echo "Log file preserved at: $LOG_FILE"
