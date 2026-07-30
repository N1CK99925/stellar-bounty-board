# Architecture

## Overview

This project is a decentralized bounty board built on Stellar's Soroban smart
contract platform. Anyone can post a paid task (a "bounty"), anyone can claim
it, and when the creator marks it complete, the platform automatically
rewards the claimer with on-chain reputation points.

It's intentionally built as two separate contracts rather than one, so the
project demonstrates real inter-contract communication instead of a single
monolithic contract.

```
┌─────────────────────┐        ┌──────────────────────┐
│   Frontend (React)  │        │                       │
│  - Wallet connect    │──────▶│   bounty-contract     │
│  - Create/claim/     │       │  - create_bounty      │
│    complete bounty   │       │  - claim_bounty       │
└─────────────────────┘        │  - complete_bounty ───┼──┐
                                │  - cancel_bounty      │  │ inter-contract
                                │  - get_bounty         │  │ call on
                                └──────────────────────┘  │ completion
                                                           │
                                ┌──────────────────────┐  │
                                │  reputation-contract  │◀─┘
                                │  - increase_reputation│
                                │  - get_reputation     │
                                │  - set_authorized_    │
                                │    caller             │
                                └──────────────────────┘
```

## Contracts

### `reputation-contract`

Stores a reputation score per Stellar address. Only one contract address
(configured via `set_authorized_caller`) is allowed to increase anyone's
score. In this project that's the bounty contract, but the design keeps the
reputation contract generic and reusable by other future contracts.

Access control detail worth calling out: when the bounty contract calls
`increase_reputation`, the reputation contract requires
`authorized_caller.require_auth()`. A contract can authorize a call it is
itself making without a separate signature, so this check passes
automatically for the bounty contract but fails for everyone else,
including a user's own wallet trying to call it directly.

### `bounty-contract`

Owns the bounty lifecycle: `Open -> Claimed -> Completed` (or `Cancelled`
from `Open`). On `complete_bounty`, it makes a cross-contract call into the
reputation contract to reward the claimer, and returns the claimer's updated
score to the caller.

Note on data modeling: a bounty's claimer is stored under its own storage
key (`BountyClaimer(id)`) rather than as an `Option<Address>` field inside
the `Bounty` struct. Soroban's `#[contracttype]` derive does not support
`Option<Address>` as a struct field directly, since `Address` is represented
as a host object rather than a plain XDR value. Splitting it into a separate
entry avoids that limitation cleanly.

## Events

Both contracts publish events for real-time updates:

| Contract | Event topic | Emitted on |
|---|---|---|
| bounty-contract | `b_create` | bounty created |
| bounty-contract | `b_claim` | bounty claimed |
| bounty-contract | `b_done` | bounty completed |
| bounty-contract | `b_cancel` | bounty cancelled |
| reputation-contract | `rep_up` | reputation increased |

A frontend can subscribe to these via the Soroban RPC `getEvents` endpoint
to drive a real-time activity feed instead of polling.

## Frontend

A Vite + React + TypeScript single-page app:

- `lib/wallet.ts` — Freighter wallet connection
- `lib/contracts.ts` — builds/simulates Soroban transactions
- `lib/mockData.ts` — sample data shown before a contract is deployed
- `components/` — presentational, individually tested components
- `App.tsx` — wiring, loading states, and error handling

The app runs in "demo mode" (sample data, clearly labeled) whenever
`VITE_BOUNTY_CONTRACT_ID` is not set, so the UI is fully explorable and
screenshot-able even before you deploy.

## Testing strategy

- **Contracts**: Soroban's native test harness (`cargo test`), using
  `Env::default()` with `mock_all_auths()` to exercise the full lifecycle
  across both contracts in the same test environment, including the
  cross-contract call.
- **Frontend**: Vitest + React Testing Library for component behavior
  (validation, disabled/loading states, conditional rendering) and an
  integration test of `App`'s demo-mode data loading.

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request:

1. Builds and tests both contracts, then builds them to WASM and uploads
   the binaries as workflow artifacts.
2. Type-checks, tests, and builds the frontend.

See `docs/DEPLOYMENT.md` for how to take the built WASM to an actual
network.
