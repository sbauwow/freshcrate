#!/usr/bin/env bash
set -euo pipefail

IMAGE="railway-dev-box"
BUNDLE="solo-builder-core"
MODE="headless"
CHANNEL="stable"
VERSION="0.1.0"
REGION="us-east-1"

usage() {
  cat <<'EOF'
Usage: bash scripts/build-agent-edition-image.sh [--image IMAGE] [--bundle BUNDLE] [--mode MODE] [--channel CHANNEL] [--region AWS_REGION]

Images:
  railway-dev-box | vm-qcow2-headless | aws-ami-builder
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --bundle)
      BUNDLE="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --channel)
      CHANNEL="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

case "$IMAGE" in
  railway-dev-box|vm-qcow2-headless|aws-ami-builder) ;;
  *) echo "unsupported image: $IMAGE" >&2; exit 1 ;;
esac

case "$CHANNEL" in
  stable) VERSION="0.1.0" ;;
  beta) VERSION="0.2.0-beta" ;;
  nightly) VERSION="0.3.0-nightly" ;;
  *) echo "unsupported channel: $CHANNEL" >&2; exit 1 ;;
esac

TEMPLATE="images/${IMAGE}.pkr.hcl"
[[ -f "$TEMPLATE" ]] || { echo "missing template: $TEMPLATE" >&2; exit 1; }

if ! command -v packer >/dev/null 2>&1; then
  echo "packer is required" >&2
  exit 1
fi

PACKER_ARGS=(
  -var "bundle=${BUNDLE}"
  -var "mode=${MODE}"
  -var "channel=${CHANNEL}"
  -var "version=${VERSION}"
  -var "target=ubuntu-24.04-x86_64"
)

if [[ "$IMAGE" == "aws-ami-builder" ]]; then
  PACKER_ARGS+=( -var "region=${REGION}" )
fi

exec packer build "${PACKER_ARGS[@]}" "$TEMPLATE"
