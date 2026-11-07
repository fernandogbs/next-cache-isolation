#!/usr/bin/env bash
# Stress / repeatability checks against the M1–M6 product definition.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLISHED_ROUNDS="${PUBLISHED_ROUNDS:-3}"
CUSTOM_ROUNDS="${CUSTOM_ROUNDS:-3}"
PUBLISHED_PORT="${PUBLISHED_PORT:-44110}"
CUSTOM_PORT="${CUSTOM_PORT:-44210}"
REPORT=".next-cache-isolation/report.json"
ASSERT_JS="$ROOT/scripts/assert-report.mjs"

EXPECTED_PUBLISHED='[
  {"id":"ghsa-mfr8-vulnerable","expected":"FAIL","actual":"FAIL"},
  {"id":"ghsa-mfr8-patched","expected":"PASS","actual":"PASS"},
  {"id":"ghsa-vc7v-vulnerable","expected":"FAIL","actual":"FAIL"},
  {"id":"ghsa-vc7v-patched","expected":"PASS","actual":"PASS"},
  {"id":"ghsa-rhh4-vulnerable","expected":"FAIL","actual":"FAIL"},
  {"id":"ghsa-rhh4-patched","expected":"PASS","actual":"PASS"},
  {"id":"ghsa-vvgp-vulnerable","expected":"FAIL","actual":"FAIL"},
  {"id":"ghsa-vvgp-patched","expected":"PASS","actual":"PASS"}
]'

EXPECTED_CUSTOM='[
  {"id":"ghsa-rhh4-vulnerable","expected":"FAIL","actual":"FAIL"},
  {"id":"ghsa-rhh4-patched","expected":"PASS","actual":"PASS"}
]'

log() { printf '%s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

assert_report() {
  local suite="$1"
  local expected_json="$2"
  local label="$3"
  [[ -f "$REPORT" ]] || fail "$label: missing $REPORT"
  node "$ASSERT_JS" "$REPORT" "$suite" "$expected_json" "$label"
}

log "==> build CLI"
npm run build >/dev/null

log "==> doctor (custom example)"
node dist/cli/index.js doctor --config examples/custom-suite.rhh4.yml
doctor_ec=$?
[[ "$doctor_ec" -eq 0 ]] || fail "doctor exit $doctor_ec (want 0)"

log "==> published suite × $PUBLISHED_ROUNDS"
for i in $(seq 1 "$PUBLISHED_ROUNDS"); do
  port=$((PUBLISHED_PORT + (i - 1) * 20))
  log "--- published round $i / $PUBLISHED_ROUNDS (base-port $port)"
  set +e
  node dist/cli/index.js test --suite published --base-port "$port"
  ec=$?
  set -e
  [[ "$ec" -eq 0 ]] || fail "published round $i exit $ec (want 0)"
  assert_report published "$EXPECTED_PUBLISHED" "published#$i"
done

log "==> custom suite (rhh4) × $CUSTOM_ROUNDS"
for i in $(seq 1 "$CUSTOM_ROUNDS"); do
  port=$((CUSTOM_PORT + (i - 1) * 10))
  log "--- custom round $i / $CUSTOM_ROUNDS (base-port $port)"
  set +e
  node dist/cli/index.js test --suite custom --config examples/custom-suite.rhh4.yml --base-port "$port"
  ec=$?
  set -e
  [[ "$ec" -eq 0 ]] || fail "custom round $i exit $ec (want 0)"
  assert_report custom "$EXPECTED_CUSTOM" "custom#$i"
done

log "==> empty-suite / bad-config fail-closed"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
cat > "$tmpdir/next-cache-isolation.yml" <<'YAML'
version: 1
suite: custom
fixtures:
  - path: ./does-not-exist
YAML
set +e
node dist/cli/index.js doctor --config "$tmpdir/next-cache-isolation.yml" >/dev/null
doctor_bad=$?
node dist/cli/index.js test --suite custom --config "$tmpdir/next-cache-isolation.yml" --base-port 44990 >/dev/null
test_bad=$?
set -e
[[ "$doctor_bad" -eq 1 ]] || fail "doctor on missing fixture want exit 1 got $doctor_bad"
[[ "$test_bad" -eq 2 ]] || fail "custom suite missing fixture want exit 2 got $test_bad"
log "fail-closed OK (doctor=$doctor_bad test=$test_bad)"

log ""
log "STRESS OK: published×$PUBLISHED_ROUNDS + custom×$CUSTOM_ROUNDS + fail-closed checks"
