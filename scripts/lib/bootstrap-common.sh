#!/usr/bin/env bash
set -euo pipefail

FRESHCRATE_HOME_DEFAULT="${HOME}/.freshcrate"
WORKSPACE_DEFAULT="${HOME}/workspace"

log() {
  printf '[freshcrate-agent-edition] %s\n' "$*"
}

die() {
  printf '[freshcrate-agent-edition] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

supports_bundle() {
  case "$1" in
    solo-builder-core|research-node|local-model-box) return 0 ;;
    *) return 1 ;;
  esac
}

bundle_packages() {
  case "$1" in
    solo-builder-core|research-node|local-model-box)
      printf '%s\n' git zsh tmux curl jq ripgrep fd-find sqlite3 python3 python3-venv python3-pip nodejs npm gh
      ;;
  esac
}

bundle_services() {
  printf '%s\n' docker
}

bundle_dirs() {
  printf '%s\n' \
    "${WORKSPACE_DIR}" \
    "${WORKSPACE_DIR}/projects" \
    "${WORKSPACE_DIR}/research" \
    "${FRESHCRATE_HOME}" \
    "${FRESHCRATE_HOME}/logs" \
    "${FRESHCRATE_HOME}/receipts" \
    "${FRESHCRATE_HOME}/models"
}

parse_common_args() {
  BUNDLE="solo-builder-core"
  MODE="headless"
  CHANNEL="stable"
  FRESHCRATE_HOME="${FRESHCRATE_HOME_DEFAULT}"
  WORKSPACE_DIR="${WORKSPACE_DEFAULT}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
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
      --freshcrate-home)
        FRESHCRATE_HOME="${2:-}"
        shift 2
        ;;
      --workspace-dir)
        WORKSPACE_DIR="${2:-}"
        shift 2
        ;;
      --help|-h)
        return 2
        ;;
      *)
        die "unknown argument: $1"
        ;;
    esac
  done

  supports_bundle "$BUNDLE" || die "unsupported bundle: $BUNDLE"
  [[ "$MODE" == "headless" || "$MODE" == "light-desktop" ]] || die "unsupported mode: $MODE"
  [[ "$CHANNEL" == "stable" || "$CHANNEL" == "beta" || "$CHANNEL" == "nightly" ]] || die "unsupported channel: $CHANNEL"
}
