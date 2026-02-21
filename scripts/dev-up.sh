#!/usr/bin/env bash

set -euo pipefail

PORT=8081
PID_FILE="/tmp/sociallens-backend.pid"
LOG_FILE="/tmp/backend.log"
BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FORCE_KILL=false
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--force)
      FORCE_KILL=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [-f|--force]"
      echo "  -f, --force    Automatically kill existing process on port $PORT"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}SocialLens Backend Dev Server${NC}"
echo "========================================"

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
  PROCESS_INFO=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")

  echo -e "${YELLOW}Port $PORT is already in use!${NC}"
  echo "PID: $PID"
  echo "Process: $PROCESS_INFO"
  echo ""

  if [ "$FORCE_KILL" = true ]; then
    echo -e "${YELLOW}Force flag detected. Killing process...${NC}"
    kill "$PID" 2>/dev/null || true
    sleep 2

    # Check if still running
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo -e "${RED}Process still running. Attempting force kill...${NC}"
      kill -9 "$PID" 2>/dev/null || true
      sleep 1
    fi

    echo -e "${GREEN}Process killed successfully.${NC}"
  else
    echo "Options:"
    echo "  1. Stop the process: kill $PID"
    echo "  2. Use the force flag: $0 --force"
    echo "  3. Use dev-down.sh if this is a SocialLens backend instance"
    exit 1
  fi
fi

# Check if already running from previous dev-up
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}Backend already running with PID $OLD_PID${NC}"
    echo "Use './scripts/dev-down.sh' to stop it first."
    exit 1
  else
    # Stale PID file, remove it
    rm -f "$PID_FILE"
  fi
fi

# Start the backend
echo -e "${BLUE}Starting backend on port $PORT...${NC}"
echo "Backend directory: $BACKEND_DIR"
echo "Logs: $LOG_FILE"
echo ""

cd "$BACKEND_DIR"

# Clear old log file
> "$LOG_FILE"

# Start the backend in the background
./gradlew bootRun > "$LOG_FILE" 2>&1 &
BACKEND_PID=$!

# Save PID
echo "$BACKEND_PID" > "$PID_FILE"

echo -e "${GREEN}Backend starting...${NC}"
echo "PID: $BACKEND_PID"
echo ""

# Wait for the server to start (check for port to be listening)
echo -n "Waiting for server to start"
MAX_WAIT=60
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}Server started successfully!${NC}"
    echo ""
    echo "========================================"
    echo -e "${GREEN}Backend URL: http://localhost:$PORT${NC}"
    echo "========================================"
    echo ""
    echo "Logs: tail -f $LOG_FILE"
    echo "Stop: ./scripts/dev-down.sh"
    exit 0
  fi

  # Check if process died
  if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
    echo ""
    echo -e "${RED}Backend process died unexpectedly!${NC}"
    echo "Check logs: $LOG_FILE"
    echo ""
    echo "Last 20 lines of log:"
    tail -n 20 "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi

  echo -n "."
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

echo ""
echo -e "${YELLOW}Server did not start within $MAX_WAIT seconds.${NC}"
echo "The process is still running (PID: $BACKEND_PID) but the port is not responding."
echo "Check logs: $LOG_FILE"
exit 1
