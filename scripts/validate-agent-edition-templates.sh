#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

shopt -s nullglob
files=("${ROOT_DIR}"/images/*.pkr.hcl)
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "no packer templates found under images/" >&2
  exit 1
fi

for template in "${files[@]}"; do
  echo "validating ${template##${ROOT_DIR}/}"
  packer validate \
    -var 'bundle=solo-builder-core' \
    -var 'mode=headless' \
    -var 'channel=stable' \
    -var 'version=0.1.0' \
    -var 'target=ubuntu-24.04-x86_64' \
    -var 'region=us-east-1' \
    "$template"
done
