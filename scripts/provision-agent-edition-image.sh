#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${1:-solo-builder-core}"
MODE="${2:-headless}"
CHANNEL="${3:-stable}"
IMAGE_KIND="${4:-generic-image}"
FRESHCRATE_HOME="${FRESHCRATE_HOME:-/opt/freshcrate/home}"
WORKSPACE_DIR="${WORKSPACE_DIR:-/opt/freshcrate/workspace}"

mkdir -p /opt/freshcrate
chmod +x "${SCRIPT_DIR}/bootstrap-agent-edition.sh" "${SCRIPT_DIR}/verify-agent-edition.sh"

bash "${SCRIPT_DIR}/bootstrap-agent-edition.sh" \
  --bundle "${BUNDLE}" \
  --mode "${MODE}" \
  --channel "${CHANNEL}" \
  --freshcrate-home "${FRESHCRATE_HOME}" \
  --workspace-dir "${WORKSPACE_DIR}"

bash "${SCRIPT_DIR}/verify-agent-edition.sh" \
  --bundle "${BUNDLE}" \
  --mode "${MODE}" \
  --channel "${CHANNEL}" \
  --freshcrate-home "${FRESHCRATE_HOME}" \
  --workspace-dir "${WORKSPACE_DIR}"

cat > /opt/freshcrate/image-build-receipt.txt <<EOF
image_kind=${IMAGE_KIND}
bundle=${BUNDLE}
mode=${MODE}
channel=${CHANNEL}
freshcrate_home=${FRESHCRATE_HOME}
workspace_dir=${WORKSPACE_DIR}
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
