#!/usr/bin/env bash
set -euo pipefail

IMAGE="vm-qcow2-headless"
BUNDLE="solo-builder-core"
MODE="headless"
CHANNEL="stable"
OUTPUT_DIR=""
FINAL_EXTENSION=""

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
  vm-qcow2-headless)
    FINAL_EXTENSION=".qcow2"
    ;;
  iso-autoinstall-headless)
    FINAL_EXTENSION=".iso"
    ;;
  *) echo "packaging currently supports vm-qcow2-headless and iso-autoinstall-headless only" >&2; exit 1 ;;
esac

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="output/${IMAGE}"
fi

mkdir -p "$OUTPUT_DIR"
SOURCE_ARTIFACT=""

while IFS= read -r -d '' candidate; do
  base="$(basename "$candidate")"
  case "$base" in
    *.sha256|*.json|*.txt) continue ;;
  esac

  if [[ "$IMAGE" == "iso-autoinstall-headless" ]]; then
    case "$candidate" in
      *.iso) SOURCE_ARTIFACT="$candidate"; break ;;
    esac
    continue
  fi

  case "$base" in
    *.iso) continue ;;
  esac

  if command -v qemu-img >/dev/null 2>&1; then
    if qemu-img info "$candidate" >/tmp/freshcrate-qemu-img-info.txt 2>/dev/null; then
      format="$(grep '^file format:' /tmp/freshcrate-qemu-img-info.txt | awk '{print $3}')"
      if [[ "$format" == "qcow2" || "$format" == "raw" ]]; then
        SOURCE_ARTIFACT="$candidate"
        break
      fi
    fi
  fi

  case "$candidate" in
    *.qcow2|*.img) SOURCE_ARTIFACT="$candidate"; break ;;
  esac
done < <(find "$OUTPUT_DIR" -type f -print0 | sort -z)

[[ -n "$SOURCE_ARTIFACT" ]] || {
  echo "no qcow2/image artifact found under $OUTPUT_DIR" >&2
  find "$OUTPUT_DIR" -maxdepth 3 -type f | sort >&2 || true
  exit 1
}

FINAL_ARTIFACT="${OUTPUT_DIR}/freshcrate-${BUNDLE}-${CHANNEL}${FINAL_EXTENSION}"
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
