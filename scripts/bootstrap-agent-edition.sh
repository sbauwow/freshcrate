#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/bootstrap-common.sh
source "${SCRIPT_DIR}/lib/bootstrap-common.sh"

usage() {
  cat <<'EOF'
Usage: bash scripts/bootstrap-agent-edition.sh [--bundle BUNDLE] [--mode headless|light-desktop] [--channel stable|beta|nightly]

Bundles:
  solo-builder-core | research-node | local-model-box

This script targets Ubuntu 24.04 x86_64 and lays down the minimal agentic substrate:
- creates workspace + ~/.freshcrate layout
- installs core packages if apt is available
- ensures uv is installed
- prints next verification command
EOF
}

if ! parse_common_args "$@"; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

log "bundle=${BUNDLE} mode=${MODE} channel=${CHANNEL}"

require_cmd uname
ARCH="$(uname -m)"
[[ "$ARCH" == "x86_64" ]] || die "Agent Edition v0 supports x86_64 only (found: $ARCH)"

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] || die "Agent Edition v0 supports Ubuntu only (found: ${ID:-unknown})"
  [[ "${VERSION_ID:-}" == "24.04" ]] || die "Agent Edition v0 supports Ubuntu 24.04 only (found: ${VERSION_ID:-unknown})"
else
  die "/etc/os-release not found"
fi

for dir in $(bundle_dirs); do
  mkdir -p "$dir"
done
log "created workspace and ~/.freshcrate directories"

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  log "refreshing apt metadata"
  sudo apt-get update -y

  mapfile -t PKGS < <(bundle_packages "$BUNDLE")
  log "installing bundle packages: ${PKGS[*]}"
  sudo apt-get install -y software-properties-common curl ca-certificates gnupg lsb-release "${PKGS[@]}"

  if ! command -v uv >/dev/null 2>&1; then
    log "installing uv"
    curl -LsSf https://astral.sh/uv/install.sh | sh
  fi

  if [[ -x /root/.local/bin/uv && ! -x /usr/local/bin/uv ]]; then
    sudo ln -sf /root/.local/bin/uv /usr/local/bin/uv
  fi

  if [[ -x /root/.local/bin/uvx && ! -x /usr/local/bin/uvx ]]; then
    sudo ln -sf /root/.local/bin/uvx /usr/local/bin/uvx
  fi

  if ! command -v docker >/dev/null 2>&1; then
    log "docker not found; install manually or extend this script with repo setup"
  fi

  if [[ "$MODE" == "light-desktop" ]]; then
    log "light-desktop mode selected; no heavy desktop is installed by default"
  fi
else
  log "apt-get unavailable; skipped package installation"
fi

RECEIPT_PATH="${FRESHCRATE_HOME}/receipts/bootstrap-${BUNDLE}.txt"
cat > "$RECEIPT_PATH" <<EOF
bundle=${BUNDLE}
mode=${MODE}
channel=${CHANNEL}
os=${ID:-unknown}
version=${VERSION_ID:-unknown}
arch=${ARCH}
workspace=${WORKSPACE_DIR}
freshcrate_home=${FRESHCRATE_HOME}
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
log "wrote receipt: ${RECEIPT_PATH}"

log "next: bash scripts/verify-agent-edition.sh --bundle ${BUNDLE} --mode ${MODE} --channel ${CHANNEL} --freshcrate-home ${FRESHCRATE_HOME} --workspace-dir ${WORKSPACE_DIR}"
