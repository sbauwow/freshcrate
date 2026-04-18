#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/bootstrap-common.sh
source "${SCRIPT_DIR}/lib/bootstrap-common.sh"

usage() {
  cat <<'EOF'
Usage: bash scripts/verify-agent-edition.sh [--bundle BUNDLE] [--mode headless|light-desktop] [--channel stable|beta|nightly]

Runs grounded checks for the freshcrate Agent Edition minimal substrate.
EOF
}

if ! parse_common_args "$@"; then
  usage
  exit 0
fi

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf '[PASS] %s\n' "$*"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf '[FAIL] %s\n' "$*"
}

check_cmd() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    pass "command available: $cmd"
  else
    fail "command missing: $cmd"
  fi
}

check_path() {
  local path="$1"
  if [[ -e "$path" ]]; then
    pass "path exists: $path"
  else
    fail "path missing: $path"
  fi
}

ARCH="$(uname -m 2>/dev/null || true)"
[[ "$ARCH" == "x86_64" ]] && pass "arch is x86_64" || fail "arch mismatch: ${ARCH:-unknown}"

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] && pass "os is ubuntu" || fail "os mismatch: ${ID:-unknown}"
  [[ "${VERSION_ID:-}" == "24.04" ]] && pass "version is 24.04" || fail "version mismatch: ${VERSION_ID:-unknown}"
else
  fail "/etc/os-release missing"
fi

for cmd in git tmux jq sqlite3 node npm; do
  check_cmd "$cmd"
done

if command -v rg >/dev/null 2>&1; then
  pass "command available: rg"
elif command -v ripgrep >/dev/null 2>&1; then
  pass "command available: ripgrep"
else
  fail "command missing: rg/ripgrep"
fi

if command -v fd >/dev/null 2>&1; then
  pass "command available: fd"
elif command -v fdfind >/dev/null 2>&1; then
  pass "command available: fdfind"
else
  fail "command missing: fd/fdfind"
fi

if command -v python3 >/dev/null 2>&1; then
  pass "command available: python3"
else
  fail "command missing: python3"
fi

if command -v uv >/dev/null 2>&1; then
  pass "command available: uv"
else
  fail "command missing: uv"
fi

for path in $(bundle_dirs); do
  check_path "$path"
done

RECEIPT_PATH="${FRESHCRATE_HOME}/receipts/bootstrap-${BUNDLE}.txt"
check_path "$RECEIPT_PATH"

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    pass "docker reachable"
  else
    fail "docker installed but daemon unreachable"
  fi
else
  pass "docker optional for current bootstrap image lane"
fi

if [[ "$BUNDLE" == "local-model-box" ]]; then
  if command -v ollama >/dev/null 2>&1; then
    pass "ollama available"
  else
    fail "ollama missing for local-model-box"
  fi
fi

VERIFY_RECEIPT_PATH="${FRESHCRATE_HOME}/receipts/verify-${BUNDLE}.txt"
cat > "$VERIFY_RECEIPT_PATH" <<EOF
bundle=${BUNDLE}
mode=${MODE}
channel=${CHANNEL}
pass_count=${PASS_COUNT}
fail_count=${FAIL_COUNT}
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

printf '\nSummary: %s pass / %s fail\n' "$PASS_COUNT" "$FAIL_COUNT"
printf 'Receipt: %s\n' "$VERIFY_RECEIPT_PATH"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
