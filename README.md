# Stellar Bounty Board

A decentralized bounty board built on Stellar's Soroban smart contract
platform. Anyone can post a paid task, anyone can claim it, and completing
it automatically rewards the claimer with on-chain reputation — a real
example of two smart contracts talking to each other, not just a single
demo contract.

This project was built as a Level 3 (Orange Belt) submission, focused on
production-style practices rather than a beginner demo: two communicating
contracts, automated tests on both the contract and frontend layers, a CI
pipeline, and a documented deployment process.

## What this actually demonstrates

- **Inter-contract communication** — the bounty contract calls the
  reputation contract directly when a bounty is completed, and the
  reputation contract enforces that only the bounty contract is allowed to
  do that.
- **Event streaming** — both contracts publish on-chain events
  (`b_create`, `b_claim`, `b_done`, `b_cancel`, `rep_up`) that a frontend
  can subscribe to for real-time updates instead of polling.
- **Automated testing** — 10 Rust unit tests across both contracts
  covering the full bounty lifecycle and access control, plus 9 frontend
  tests covering validation, loading/error states, and conditional
  rendering.
- **CI/CD** — GitHub Actions builds and tests the contracts (including
  compiling them to WASM) and the frontend on every push and pull request.
- **Production-style error handling** — the frontend surfaces wallet and
  contract errors as dismissible banners instead of crashing, shows
  loading states while data is fetched, and runs in a clearly labeled demo
  mode with sample data until a contract is actually deployed and
  configured.

## Project structure

```
.
├── contracts/
│   ├── bounty/            # Bounty lifecycle contract
│   └── reputation/        # Reputation scoring contract
├── frontend/               # Vite + React + TypeScript app
├── scripts/
│   ├── build.sh            # Build both contracts to WASM
│   ├── deploy.sh           # Deploy, initialize, and wire up both contracts
│   └── demo_interaction.sh # Scripted create/claim/complete for a real tx hash
├── docs/
│   ├── ARCHITECTURE.md     # How the pieces fit together, in more detail
│   └── DEPLOYMENT.md       # Step-by-step deployment walkthrough
└── .github/workflows/ci.yml
```

See `docs/ARCHITECTURE.md` for a deeper explanation of the contract design,
including a specific Soroban data-modeling limitation this project worked
around (`Option<Address>` is not supported directly as a `#[contracttype]`
struct field).

## Running it locally

### Contracts

```bash
cargo test --workspace
```

This runs all 10 contract tests without needing any network access or a
deployed instance — `Env::default()` simulates the Soroban host directly.

### Frontend

```bash
cd frontend
npm install
npm test        # runs the 9 frontend tests
npm run dev     # starts a local dev server with sample/demo data
```

The frontend works out of the box with sample data (clearly labeled "Demo
mode") so you can explore the UI without deploying anything first. To
connect it to a real deployed contract, see `docs/DEPLOYMENT.md`.

## Deploying for real

Full step-by-step instructions, including common failure points and how to
fix them, are in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Short
version:

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli

./scripts/build.sh
stellar keys generate alice --network testnet
stellar keys fund alice --network testnet
./scripts/deploy.sh testnet alice
```

## Submission checklist

Everything in code, tests, and CI is complete and verified in this
repository. The items below depend on an actual live deployment and are
filled in after following `docs/DEPLOYMENT.md`:

- [ ] Live demo link: `TODO — add your Vercel/Netlify URL here`
- [ ] Bounty contract address: `TODO — from scripts/deploy.sh output`
- [ ] Reputation contract address: `TODO — from scripts/deploy.sh output`
- [ ] Transaction hash: `TODO — from scripts/demo_interaction.sh output`
- [ ] Screenshot: mobile responsive UI
- [ ] Screenshot: CI/CD pipeline running (GitHub Actions tab)
- [ ] Screenshot: test output showing passing tests
- [ ] Demo video (1–2 minutes)

## License

MIT — see [LICENSE](LICENSE).
