#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://raw.githubusercontent.com/xiaoxya/cnc-web-manage/main/deploy.sh}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

curl -fsSL "$REPO_URL" -o "$TMP_DIR/deploy.sh"
bash "$TMP_DIR/deploy.sh" "$@"
