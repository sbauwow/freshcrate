#!/usr/bin/env bash
set -euo pipefail

IMAGE="iso-autoinstall-headless"
BUNDLE="solo-builder-core"
MODE="headless"
CHANNEL="stable"
OUTPUT_DIR=""
CACHE_DIR=""
SOURCE_ISO_URL="https://releases.ubuntu.com/24.04.2/ubuntu-24.04.2-live-server-amd64.iso"
WORK_DIR=""
# Stable default artifact contract: output/iso-autoinstall-headless/freshcrate-solo-builder-core-stable.iso

usage() {
  cat <<'EOF'
Usage: bash scripts/build-agent-edition-iso.sh [--image IMAGE] [--bundle BUNDLE] [--mode MODE] [--channel CHANNEL] [--output-dir DIR] [--cache-dir DIR] [--source-iso-url URL]

Builds a freshcrate Ubuntu 24.04 live-server autoinstall ISO with nocloud seed data and bundled bootstrap scripts.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGE="${2:-}"; shift 2 ;;
    --bundle) BUNDLE="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --channel) CHANNEL="${2:-}"; shift 2 ;;
    --output-dir) OUTPUT_DIR="${2:-}"; shift 2 ;;
    --cache-dir) CACHE_DIR="${2:-}"; shift 2 ;;
    --source-iso-url) SOURCE_ISO_URL="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

[[ "$IMAGE" == "iso-autoinstall-headless" ]] || {
  echo "unsupported image: $IMAGE" >&2
  exit 1
}

for cmd in curl 7z python3 xorriso sha256sum; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "$cmd is required" >&2
    exit 1
  }
done

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/output/${IMAGE}}"
CACHE_DIR="${CACHE_DIR:-${ROOT_DIR}/output/cache/${IMAGE}}"
WORK_DIR="${WORK_DIR:-$(mktemp -d)}"
STAGING_DIR="${WORK_DIR}/staging"
SOURCE_ISO="${CACHE_DIR}/ubuntu-24.04-live-server-amd64.iso"
FINAL_ISO="${OUTPUT_DIR}/freshcrate-${BUNDLE}-${CHANNEL}.iso"
SEED_DIR="${STAGING_DIR}/nocloud"
FRESHCRATE_DIR="${STAGING_DIR}/freshcrate"

cleanup() {
  if [[ -d "$WORK_DIR" ]]; then
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

mkdir -p "$OUTPUT_DIR" "$CACHE_DIR" "$STAGING_DIR" "$SEED_DIR" "$FRESHCRATE_DIR/scripts/lib"

if [[ ! -f "$SOURCE_ISO" ]]; then
  curl -L --fail --retry 3 -o "$SOURCE_ISO" "$SOURCE_ISO_URL"
fi

7z x -y -o"$STAGING_DIR" "$SOURCE_ISO" >/dev/null
rm -rf "${STAGING_DIR}/[BOOT]"

cp "${ROOT_DIR}/images/cloud-init/iso-autoinstall-headless/meta-data" "${SEED_DIR}/meta-data"
cp "${ROOT_DIR}/images/cloud-init/iso-autoinstall-headless/user-data" "${SEED_DIR}/user-data"
python3 - "$BUNDLE" "$MODE" "$CHANNEL" "${SEED_DIR}/user-data" <<'PY'
from pathlib import Path
import sys
bundle, mode, channel, user_data_path = sys.argv[1:]
path = Path(user_data_path)
text = path.read_text()
text = text.replace("__BUNDLE__", bundle).replace("__MODE__", mode).replace("__CHANNEL__", channel)
path.write_text(text)
PY

cp "${ROOT_DIR}/scripts/provision-agent-edition-image.sh" "${FRESHCRATE_DIR}/scripts/provision-agent-edition-image.sh"
cp "${ROOT_DIR}/scripts/bootstrap-agent-edition.sh" "${FRESHCRATE_DIR}/scripts/bootstrap-agent-edition.sh"
cp "${ROOT_DIR}/scripts/verify-agent-edition.sh" "${FRESHCRATE_DIR}/scripts/verify-agent-edition.sh"
cp "${ROOT_DIR}/scripts/lib/bootstrap-common.sh" "${FRESHCRATE_DIR}/scripts/lib/bootstrap-common.sh"
chmod +x "${FRESHCRATE_DIR}/scripts/provision-agent-edition-image.sh" "${FRESHCRATE_DIR}/scripts/bootstrap-agent-edition.sh" "${FRESHCRATE_DIR}/scripts/verify-agent-edition.sh"

python3 - "$STAGING_DIR" <<'PY'
from pathlib import Path
import sys
staging = Path(sys.argv[1])
needle = " ---"
insert = " autoinstall ds=nocloud\\;s=/cdrom/nocloud/ ---"
for relative in ("boot/grub/grub.cfg", "boot/grub/loopback.cfg", "isolinux/txt.cfg"):
    path = staging / relative
    if not path.exists():
        continue
    text = path.read_text()
    if "ds=nocloud" in text:
        continue
    path.write_text(text.replace(needle, insert))
PY

rm -f "$FINAL_ISO"
xorriso \
  -indev "$SOURCE_ISO" \
  -outdev "$FINAL_ISO" \
  -map "$STAGING_DIR" / \
  -boot_image any replay \
  -volid "freshcrate-${BUNDLE}-${CHANNEL}" \
  >/dev/null

sha256sum "$FINAL_ISO"
