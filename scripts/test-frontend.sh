#!/bin/bash
# Runs frontend tests and emits ONLY failures + summary.
# Use this instead of raw `npm run test` to keep context lean.

set -euo pipefail
cd "$(dirname "$0")/../frontend"

output=$(npx vitest run --reporter=verbose 2>&1) || true

# Always print failures and errors
echo "$output" | grep -E \
  "(FAIL |FAILED|× |✗ |AssertionError|Error:|Expected|Received|at .*\.test\.(ts|tsx))" \
  | head -60 || true

# Print summary line
echo "$output" | grep -E "^(Tests|Test Files|Duration)" || true
