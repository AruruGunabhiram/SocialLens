#!/usr/bin/env bash

# Interactive backend starter.
# Checks if the port is occupied, prompts to kill, then starts Spring Boot.
# Override port: SERVER_PORT=8082 ./scripts/dev-backend.sh

set -euo pipefail

PORT="${SERVER_PORT:-8081}"
BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}SocialLens Backend Dev Server${NC}"
echo "========================================"
echo "Port: $PORT"
echo ""

# Check if port is occupied
if lsof -Pi :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  PID=$(lsof -Pi :"$PORT" -sTCP:LISTEN -t)
  CMD=$(ps -p "$PID" -o args= 2>/dev/null || echo "unknown")

  echo -e "${YELLOW}Port $PORT is already in use.${NC}"
  echo "  PID : $PID"
  echo "  CMD : $CMD"
  echo ""

  read -r -p "Kill that process and continue? [y/N] " answer
  case "$answer" in
    [yY][eE][sS]|[yY])
      echo -e "${YELLOW}Killing PID $PID...${NC}"
      kill "$PID" 2>/dev/null || true
      sleep 2

      # Fall back to SIGKILL if still alive
      if lsof -Pi :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Still running — sending SIGKILL...${NC}"
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
      fi
      echo -e "${GREEN}Process killed.${NC}"
      echo ""
      ;;
    *)
      echo ""
      echo "Aborted. To start on a different port instead:"
      echo "  SERVER_PORT=8082 $0"
      exit 1
      ;;
  esac
fi

# Start the backend (foreground so logs go to terminal)
echo -e "${BLUE}Starting backend on port $PORT...${NC}"
echo "Stop: Ctrl-C"
echo ""

cd "$BACKEND_DIR"
export SERVER_PORT="$PORT"
exec ./gradlew bootRun
