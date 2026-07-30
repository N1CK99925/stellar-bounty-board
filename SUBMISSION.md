# Stellar Bounty Board — Level 3 Orange Belt Submission Checklist

## Repository & History

- [x] Public GitHub repository: https://github.com/N1CK99925/stellar-bounty-board
- [x] 10+ meaningful commits (repository already has 16+)

---

## CI/CD

- [x] CI pipeline passing on GitHub Actions
  - **How to verify**: Go to https://github.com/N1CK99925/stellar-bounty-board/actions
  - **What to capture**: Screenshot of the "CI" workflow showing both "Build & test Soroban contracts" and "Build & test frontend" jobs with green ✅ checkmarks

---

## Tests

- [x] 3+ passing contract tests (actual: **10 tests** — 6 bounty + 4 reputation)
- [x] 3+ passing frontend tests (actual: **9 tests** — 2 App + 4 BountyCard + 3 CreateBountyForm)

  **How to capture test output screenshot**:
  ```bash
  cargo test --workspace
  # Capture terminal showing: "6 passed" (bounty) + "4 passed" (reputation)

  cd frontend && npm test
  # Capture terminal showing: "9 passed"
  ```

---

## Smart Contract Deployment

- [ ] Contracts built to WASM: `./scripts/build.sh`
- [ ] Contracts deployed to Stellar testnet: `./scripts/deploy.sh testnet alice`
- [x] Bounty contract ID recorded: `CDILINO5W2FYL6IDIKUICS7OGYXQWMMUIA2GO4FRI2I4YV5UZQ5FFJYM`
- [x] Reputation contract ID recorded: `CDG4TDKVA3L64BNNTF5P754WCDIAYHOROY4GEAISNXWRSOQTEBBLPFPJ`

  **How to deploy**:
  ```bash
  # 1. Install stellar-cli (once)
  cargo install --locked stellar-cli

  # 2. Build contracts
  ./scripts/build.sh

  # 3. Create and fund testnet identity (once)
  stellar keys generate alice --network testnet
  stellar keys fund alice --network testnet

  # 4. Deploy
  ./scripts/deploy.sh testnet alice
  # Outputs:  VITE_BOUNTY_CONTRACT_ID=C...
  #           VITE_REPUTATION_CONTRACT_ID=C...
  ```

---

## Real Contract Interaction

- [x] Transaction hash from a real on-chain interaction: `f6b6fab4c32c1ca3e7185b17921caf4dbbbf597885678a828516132c577637f1`
- [x] Transaction visible on explorer: `https://stellar.expert/explorer/testnet/tx/f6b6fab4c32c1ca3e7185b17921caf4dbbbf597885678a828516132c577637f1`

  **How to generate**:
  ```bash
  ./scripts/demo_interaction.sh testnet alice <BOUNTY_CONTRACT_ID> <REPUTATION_CONTRACT_ID>
  # The complete_bounty call triggers the inter-contract reputation update.
  # Copy the transaction hash printed by the last stellar contract invoke call.
  ```

---

## Live Frontend

- [x] Frontend deployed to Vercel (or Netlify)
- [x] Live URL: `https://stellarbountyboard.netlify.app/`

  **How to deploy**:
  ```bash
  cd frontend
  # Set VITE_BOUNTY_CONTRACT_ID and VITE_REPUTATION_CONTRACT_ID in
  # Vercel project settings → Environment Variables before deploying.
  npx vercel --prod
  ```

---

## Screenshots

Capture these screenshots and link them in README.md:

### 1. Mobile Responsive UI
- **Where**: Open `<TODO: LIVE_DEMO_URL>` in Chrome → DevTools (F12) → Toggle device toolbar → iPhone 14 or 375×812
- **What to show**: The full bounty board including header, "Post a new bounty" form, and at least one bounty card
- **File**: `docs/screenshots/mobile-ui.png`

### 2. CI/CD Pipeline Passing
- **Where**: https://github.com/N1CK99925/stellar-bounty-board/actions → Latest CI run
- **What to show**: Both job boxes ("Build & test Soroban contracts" AND "Build & test frontend") with green ✅
- **File**: `docs/screenshots/ci-passing.png`

### 3. Test Output (3+ passing tests)
- **Where**: Your terminal after running `cargo test --workspace`
- **What to show**: The lines "running 6 tests ... test result: ok. 6 passed" and "running 4 tests ... test result: ok. 4 passed"
- **Optionally also**: Frontend `npm test` showing "9 passed"
- **File**: `docs/screenshots/tests-passing.png`

---

## Demo Video

- [ ] 1–2 minute demo video recorded
- [ ] Video uploaded to YouTube/Loom/etc.
- [ ] Video link added to README: `<TODO: DEMO_VIDEO_URL>`
- [ ] Video link added below: `<TODO: DEMO_VIDEO_URL>`

  See [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) for a concise script.

---

## Final README Placeholders to Replace

After completing the above, search the README.md for these strings and replace them:

| Placeholder | Replace With |
|---|---|
| `<TODO: BOUNTY_CONTRACT_ID>` | Your deployed bounty contract ID (e.g. `CAABC...`) |
| `<TODO: REPUTATION_CONTRACT_ID>` | Your deployed reputation contract ID |
| `<TODO: TRANSACTION_HASH>` | Hash from `demo_interaction.sh` |
| `<TODO: LIVE_DEMO_URL>` | Your Vercel URL (e.g. `https://stellar-bounty-board.vercel.app`) |
| `<TODO: DEMO_VIDEO_URL>` | YouTube/Loom URL |

---

## Final Submission Status

| Requirement | Status | Notes |
|---|---|---|
| Public GitHub repository | ✅ READY | https://github.com/N1CK99925/stellar-bounty-board |
| 10+ meaningful commits | ✅ READY | 16+ commits in history |
| CI/CD pipeline | ✅ READY | GitHub Actions — needs push to trigger |
| 3+ contract tests passing | ✅ READY | 10 tests (6 bounty + 4 reputation) |
| 3+ frontend tests passing | ✅ READY | 9 tests |
| Contracts deployed | ✅ READY | Already deployed and verified on Stellar testnet |
| Bounty contract ID | ✅ READY | `CDILINO5W2FYL6IDIKUICS7OGYXQWMMUIA2GO4FRI2I4YV5UZQ5FFJYM` |
| Reputation contract ID | ✅ READY | `CDG4TDKVA3L64BNNTF5P754WCDIAYHOROY4GEAISNXWRSOQTEBBLPFPJ` |
| Real interaction tx hash | ✅ READY | `f6b6fab4c32c1ca3e7185b17921caf4dbbbf597885678a828516132c577637f1` |
| Live frontend deployed | ✅ READY | `https://stellarbountyboard.netlify.app/` |
| Mobile responsive screenshot | ✅ COMPLETE | Included in `docs/screenshots/mobile-ui.jpeg` |
| CI screenshot | ✅ COMPLETE | Included in `docs/screenshots/ci-passing.png` |
| Test output screenshot | ✅ COMPLETE | Included in `docs/screenshots/tests-passing.jpeg` |
| Demo video recorded | ⏳ NEEDS USER ACTION | See DEMO_SCRIPT.md |
| README placeholders replaced | ⏳ NEEDS USER ACTION | After all above are done |
