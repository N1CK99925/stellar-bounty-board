#!/usr/bin/env bash
# Builds both Soroban contracts to optimized WASM binaries.
# Requires: rustup, the wasm32-unknown-unknown target, and the Soroban CLI.
#   rustup target add wasm32-unknown-unknown
#   cargo install --locked soroban-cli   (or: cargo install --locked stellar-cli)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Building reputation-contract"
stellar contract build --package reputation-contract

echo "==> Building bounty-contract"
stellar contract build --package bounty-contract

echo ""
echo "Build complete. WASM files are in target/wasm32-unknown-unknown/release/"
ls -la target/wasm32-unknown-unknown/release/*.wasm
