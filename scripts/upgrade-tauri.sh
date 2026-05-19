#!/usr/bin/env bash
# scripts/upgrade-tauri.sh
#
# Keeps the Tauri NPM packages and Rust crates in sync.
#
# Usage:
#   bun run upgrade:tauri
#
# What it does:
#   1. Upgrades @tauri-apps/* NPM packages to the latest minor.
#   2. Reads the resolved @tauri-apps/api version from package.json.
#   3. Updates Cargo.toml [dependencies] tauri to that same major.minor.
#   4. Runs `cargo update` to pull the matching crate.
#
# NOTE: tauri-build and tauri-plugin-* have their own version lines and
# do NOT need to match @tauri-apps/api.  Only the core `tauri` crate does.

set -euo pipefail

echo "==> Upgrading @tauri-apps NPM packages..."
bun update "@tauri-apps/api" "@tauri-apps/cli"

# Read the resolved version of @tauri-apps/api
API_VERSION=$(node -p "require('./node_modules/@tauri-apps/api/package.json').version")
MAJOR=$(echo "$API_VERSION" | cut -d. -f1)
MINOR=$(echo "$API_VERSION" | cut -d. -f2)
REQUIRED="${MAJOR}.${MINOR}"

echo "==> @tauri-apps/api resolved to ${API_VERSION} — pinning Rust crate to >=${REQUIRED}"

# Update the tauri crate version in Cargo.toml using sed
CARGO_TOML="src-tauri/Cargo.toml"
sed -i.bak \
  "s/^tauri = { version = \"[0-9.]*\"/tauri = { version = \"${REQUIRED}\"/" \
  "$CARGO_TOML"
rm -f "${CARGO_TOML}.bak"

echo "==> Running cargo update..."
cargo update --manifest-path "$CARGO_TOML"

echo ""
echo "Done! Verify with:  cargo check --manifest-path $CARGO_TOML"
echo "Then commit:        git add package.json bun.lock $CARGO_TOML src-tauri/Cargo.lock"
