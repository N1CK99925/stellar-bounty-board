#!/usr/bin/env bash
# Runs a full sample interaction against already-deployed contracts, so you
# can generate a transaction hash for your submission checklist.
#
# Usage:
#   ./scripts/demo_interaction.sh <network> <admin-identity> <bounty-contract-id> <reputation-contract-id>
set -euo pipefail

NETWORK="${1:?network required, e.g. testnet}"
IDENTITY="${2:?identity required, e.g. alice}"
BOUNTY_ID="${3:?bounty contract id required}"
REPUTATION_ID="${4:?reputation contract id required}"

ADMIN_ADDRESS=$(stellar keys address "$IDENTITY")

echo "==> Creating a sample bounty (id=1)"
stellar contract invoke \
  --id "$BOUNTY_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- create_bounty \
  --creator "$ADMIN_ADDRESS" \
  --id 1 \
  --amount 1000 \
  --description "Sample bounty created from demo_interaction.sh"

echo "==> Claiming the bounty as the same identity (for demo purposes)"
stellar contract invoke \
  --id "$BOUNTY_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- claim_bounty \
  --claimer "$ADMIN_ADDRESS" \
  --id 1

echo "==> Completing the bounty (triggers the inter-contract reputation call)"
stellar contract invoke \
  --id "$BOUNTY_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- complete_bounty \
  --creator "$ADMIN_ADDRESS" \
  --id 1

echo "==> Reading back the claimer's reputation score"
stellar contract invoke \
  --id "$REPUTATION_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- get_reputation \
  --user "$ADMIN_ADDRESS"

echo ""
echo "Copy the transaction hash printed above (or from the network's"
echo "explorer, e.g. https://stellar.expert) for your submission checklist."
