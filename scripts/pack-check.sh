#!/usr/bin/env bash
# Verify both libraries are publishable: build, dry-run pack, package lint, type resolution.
# Does NOT publish anything.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

for pkg in core cameras; do
  echo "== packages/$pkg =="
  (
    cd "packages/$pkg"
    npm pack --dry-run
    npx publint --strict
  )
done

# Type resolution as seen by consumers (packs to a temp dir, then deletes it).
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for pkg in core cameras; do
  (cd "packages/$pkg" && npm pack --silent --pack-destination "$TMP" >/dev/null 2>&1)
done
for tgz in "$TMP"/*.tgz; do
  # ESM-only libraries: the esm-only profile ignores CommonJS resolution modes.
  npx attw "$tgz" --profile esm-only
done
echo "pack:check OK"
