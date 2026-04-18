#!/usr/bin/env bash
set -euo pipefail

IMAGE="vm-qcow2-headless"
BUNDLE="solo-builder-core"
MODE="headless"
CHANNEL="stable"
OUTPUT_DIR=""

usage() {
  cat <<'EOF'
Usage: bash scripts/package-agent-edition-image.sh [--image IMAGE] [--bundle BUNDLE] [--mode MODE] [--channel CHANNEL] [--output-dir DIR]

Packages the first usable Linux image lane by naming and checksumming the built artifact.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGE="${2:-}"; shift 2 ;;
    --bundle) BUNDLE="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --channel) CHANNEL="${2:-}"; shift 2 ;;
    --output-dir) OUTPUT_DIR="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

case "$IMAGE" in
  vm-qcow2-headless) ;;
  *) echo "packaging currently supports vm-qcow2-headless only" >&2; exit 1 ;;
esac

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="output/${IMAGE}"
fi

mkdir -p "$OUTPUT_DIR"
SOURCE_ARTIFACT="$(find "$OUTPUT_DIR" -maxdepth 1 -type f \( -name '*.qcow2' -o -name '*.img' \) | head -1)"
[[ -n "$SOURCE_ARTIFACT" ]] || { echo "no qcow2/image artifact found under $OUTPUT_DIR" >&2; exit 1; }

FINAL_ARTIFACT="${OUTPUT_DIR}/freshcrate-${BUNDLE}-${CHANNEL}.qcow2"
if [[ "$SOURCE_ARTIFACT" != "$FINAL_ARTIFACT" ]]; then
  cp "$SOURCE_ARTIFACT" "$FINAL_ARTIFACT"
fi

sha256sum "$FINAL_ARTIFACT" > "${FINAL_ARTIFACT}.sha256"
SHA256="$(cut -d' ' -f1 < "${FINAL_ARTIFACT}.sha256")"
SIZE_BYTES="$(stat -c '%s' "$FINAL_ARTIFACT")"
UPDATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
cat > "${FINAL_ARTIFACT}.json" <<EOF
{"image":"${IMAGE}","bundle":"${BUNDLE}","mode":"${MODE}","channel":"${CHANNEL}","artifact":"${FINAL_ARTIFACT}","checksum_file":"${FINAL_ARTIFACT}.sha256","sha256":"${SHA256}","file_size_bytes":${SIZE_BYTES},"updated_at":"${UPDATED_AT}"}
EOF

echo "$FINAL_ARTIFACT"
echo "${FINAL_ARTIFACT}.sha256"
