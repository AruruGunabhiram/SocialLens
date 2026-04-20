#!/bin/bash
# Runs backend tests and emits ONLY failures + final summary.
# Use this instead of raw `./gradlew test` to keep context lean.
# Pass extra args: ./scripts/test-backend.sh --tests "*.AnalyticsControllerTest"

set -euo pipefail
cd "$(dirname "$0")/.."

./gradlew test "$@" 2>&1 | grep -E \
  "(FAILED|ERROR|> Task :test|BUILD (FAILED|SUCCESSFUL)|[0-9]+ tests?,|tests run:|at com\\.LogicGraph)" \
  | grep -v "^$" \
  || true

# Supplement with XML result counts
RESULTS_DIR="backend/build/test-results"
if [ -d "$RESULTS_DIR" ]; then
  total=0; passed=0; failed=0; errors=0
  while IFS= read -r f; do
    t=$(grep -o 'tests="[0-9]*"' "$f" | grep -o '[0-9]*' || echo 0)
    fa=$(grep -o 'failures="[0-9]*"' "$f" | grep -o '[0-9]*' || echo 0)
    e=$(grep -o 'errors="[0-9]*"' "$f" | grep -o '[0-9]*' || echo 0)
    total=$((total + t)); failed=$((failed + fa)); errors=$((errors + e))
  done < <(find "$RESULTS_DIR" -name "*.xml")
  passed=$((total - failed - errors))
  echo ""
  echo "SUMMARY: ${total} tests | ${passed} passed | ${failed} failed | ${errors} errors"
  if [ $((failed + errors)) -gt 0 ]; then
    echo ""
    echo "FAILING TESTS:"
    find "$RESULTS_DIR" -name "*.xml" \
      | xargs grep -l 'failures="[1-9]\|errors="[1-9]' 2>/dev/null \
      | while IFS= read -r f; do
          grep -oP 'classname="\K[^"]+|name="\K[^"]+' "$f" | paste - - 2>/dev/null || true
        done | head -20
  fi
fi
