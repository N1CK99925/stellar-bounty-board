# Deployment Guide

This walks through taking the contracts from source to a live testnet
deployment, and the frontend to a live URL. Follow it in order — most past
deployment errors people hit come from skipping a step (wrong target
installed, unfunded account, or forgetting to wire the contracts together).

## 1. Install prerequisites (once)

```bash
# Rust, if you don't already have it
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# WASM compilation target
rustup target add wasm32-unknown-unknown

# Stellar CLI (formerly "soroban-cli") — the tool that builds and deploys
# Soroban contracts
cargo install --locked stellar-cli
```

Verify:

```bash
stellar --version
rustc --version
```

## 2. Build the contracts

```bash
./scripts/build.sh
```

This produces:

```
target/wasm32-unknown-unknown/release/reputation_contract.wasm
target/wasm32-unknown-unknown/release/bounty_contract.wasm
```

If this step fails, it is almost always one of:
- `wasm32-unknown-unknown` target not installed → re-run the `rustup target add` command above
- an out-of-date `stellar-cli` → `cargo install --locked stellar-cli --force`

## 3. Create and fund a deployer identity

```bash
stellar keys generate alice --network testnet
stellar keys fund alice --network testnet
stellar keys address alice
```

`alice` is just a local key alias — nothing to do with the real name. Fund
on testnet is free (Friendbot). For mainnet you'd fund the account with real
XLM instead of `keys fund`.

## 4. Deploy and wire up both contracts

```bash
./scripts/deploy.sh testnet alice
```

This deploys both contracts, initializes them, and authorizes the bounty
contract to call the reputation contract. At the end it prints two contract
IDs — save them, you'll need them for the frontend and for your submission
checklist ("Contract deployment address").

## 5. Generate a sample transaction (for your submission checklist)

```bash
./scripts/demo_interaction.sh testnet alice <BOUNTY_CONTRACT_ID> <REPUTATION_CONTRACT_ID>
```

This creates, claims, and completes a sample bounty end-to-end, which is the
easiest way to produce a real "transaction hash for contract interaction."
Each `stellar contract invoke` call prints the transaction hash, or you can
look up the account's recent transactions on
[stellar.expert](https://stellar.expert) (switch to Testnet in the top
corner) or [stellarchain.io](https://stellarchain.io).

## 6. Configure and run the frontend locally

```bash
cd frontend
cp .env.example .env
# paste in the two contract IDs from step 4
npm install
npm run dev
```

Open the printed local URL, connect Freighter (make sure it's set to the
same network you deployed to), and try creating/claiming/completing a
bounty for real.

## 7. Deploy the frontend

Any static host works; Vercel is the easiest:

```bash
cd frontend
npm i -g vercel
vercel
```

When prompted, set the same environment variables from your `.env` in the
Vercel project settings (Project → Settings → Environment Variables), then
redeploy so the build picks them up. Netlify works the same way (drag-and-
drop `frontend/dist` after `npm run build`, or connect the repo and set the
build command to `npm run build` with publish directory `dist`).

## 8. Fill in the submission checklist

Once the above is done you'll have everything the checklist asks for:
- Live demo link → your Vercel/Netlify URL
- Contract deployment address → the two contract IDs from step 4
- Transaction hash → from step 5
- Screenshots → take them from the live app (resize your browser or use
  dev tools device mode for the mobile shot; the Actions tab of your GitHub
  repo for the CI/CD shot; your terminal or the CI logs for the test output)
- Demo video → a 1–2 minute screen recording walking through creating,
  claiming, and completing a bounty

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `error: failed to run custom build command` during `stellar contract build` | wasm32 target missing — see step 1 |
| `Error(Contract, #1)` on `initialize` | contract already initialized — each contract can only be initialized once; deploy a fresh instance |
| `Error(Contract, #3)` (Unauthorized) when calling `increase_reputation` | `set_authorized_caller` was not run, or was pointed at the wrong contract ID — re-run the last step of `deploy.sh` |
| Freighter shows the wrong network | switch Freighter's network selector to match `VITE_NETWORK_PASSPHRASE`/testnet |
| Frontend shows "Demo mode" banner forever | `VITE_BOUNTY_CONTRACT_ID` isn't set in `.env` (or wasn't set in your host's environment variables before the last deploy) |
