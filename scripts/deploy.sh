#!/usr/bin/env bash
# Deploys the reputation and bounty contracts to the given network, wires
# them together, and prints the values you need for frontend/.env.
#
# Usage:
#   ./scripts/deploy.sh <network> <admin-identity>
#
# Example:
#   ./scripts/deploy.sh testnet alice
#
# Prerequisites:
#   1. Contracts already built: ./scripts/build.sh
#   2. Soroban/Stellar CLI installed: cargo install --locked stellar-cli
#   3. An identity configured and funded on the target network:
#        stellar keys generate alice --network testnet
#        stellar keys fund alice --network testnet
set -euo pipefail

NETWORK="${1:-testnet}"
IDENTITY="${2:-alice}"

cd "$(dirname "$0")/.."

WASM_DIR="target/wasm32-unknown-unknown/release"

if [ ! -f "$WASM_DIR/reputation_contract.wasm" ] || [ ! -f "$WASM_DIR/bounty_contract.wasm" ]; then
  echo "WASM files not found. Run ./scripts/build.sh first." >&2
  exit 1
fi

echo "==> Deploying reputation-contract to $NETWORK"
REPUTATION_ID=$(stellar contract deploy \
  --wasm "$WASM_DIR/reputation_contract.wasm" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "Reputation contract ID: $REPUTATION_ID"

echo "==> Deploying bounty-contract to $NETWORK"
BOUNTY_ID=$(stellar contract deploy \
  --wasm "$WASM_DIR/bounty_contract.wasm" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "Bounty contract ID: $BOUNTY_ID"

ADMIN_ADDRESS=$(stellar keys address "$IDENTITY")

echo "==> Initializing reputation-contract"
stellar contract invoke \
  --id "$REPUTATION_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDRESS"

echo "==> Initializing bounty-contract"
stellar contract invoke \
  --id "$BOUNTY_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --reputation_contract "$REPUTATION_ID"

echo "==> Authorizing bounty-contract to call reputation-contract"
stellar contract invoke \
  --id "$REPUTATION_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- set_authorized_caller \
  --admin "$ADMIN_ADDRESS" \
  --caller "$BOUNTY_ID"

echo ""
echo "================================================================"
echo "Deployment complete. Add these to frontend/.env:"
echo ""
echo "VITE_BOUNTY_CONTRACT_ID=$BOUNTY_ID"
echo "VITE_REPUTATION_CONTRACT_ID=$REPUTATION_ID"
echo "================================================================"
