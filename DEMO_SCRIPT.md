# Demo Script — Stellar Bounty Board (1–2 Minutes)

> **Format**: Screen recording with voiceover.  
> **Target length**: 90 seconds.  
> **Tools**: OBS, Loom, or macOS/Windows screen recorder.

---

## Setup Before Recording

1. Open the live demo URL in Chrome on a desktop screen
2. Open Chrome DevTools → toggle device mode (iPhone 14 / 390×844) — you'll switch to this mid-recording
3. Have Freighter wallet extension installed and set to **Testnet**
4. Have your testnet account funded (Friendbot or prior funding)
5. Have `stellar.expert/explorer/testnet` open in a tab
6. Have the GitHub Actions tab open in another tab showing a green CI run

---

## Script

### [0:00 – 0:12] Introduction

> "This is Stellar Bounty Board — a decentralized on-chain bounty system built on Stellar Soroban. Anyone can post a bounty, anyone can claim it, and completing it automatically awards on-chain reputation through a real inter-contract call between two Soroban smart contracts."

*Show: the full desktop app with a few bounties visible.*

---

### [0:12 – 0:22] Mobile Responsive UI

> "The UI is fully mobile responsive."

*Action:* Switch Chrome DevTools to iPhone 14 device mode. Scroll to show the header, bounty form, and bounty cards all fit cleanly.

*Show: mobile layout. Take this screenshot now if you haven't already.*

*Action:* Switch back to desktop mode.

---

### [0:22 – 0:35] Wallet Connection

> "I'll connect my Freighter wallet — this is a real Stellar testnet account."

*Action:* Click "Connect Wallet". Approve in Freighter popup. The header now shows the shortened wallet address.

> "Wallet connected. The UI now shows my testnet address."

---

### [0:35 – 0:52] Create a Bounty (Real Transaction)

> "I'll post a new bounty. This creates a real Soroban transaction."

*Action:* Fill in the Create Bounty form:
- Description: `"Integrate dark mode into the settings page"`
- Amount: `250`
- Click "Create bounty"

*Action:* Approve transaction in Freighter popup.

> "The transaction was signed by Freighter and submitted to Stellar testnet. The bounty appears in the list once confirmed."

*Show: the new bounty card appears with status "Open".*

---

### [0:52 – 1:08] Claim + Complete (Inter-Contract Reputation Call)

> "Now I'll claim and complete the bounty to show the inter-contract reputation call."

*Action:* Click "Claim bounty" on any claimed-state bounty (or use a pre-seeded one). Approve in Freighter.

> "Bounty is now Claimed."

*Action:* Click "Mark completed". Approve in Freighter.

> "When complete_bounty runs on-chain, the bounty contract makes a cross-contract call to the reputation contract — awarding 10 reputation points to the claimer. This is real on-chain inter-contract communication."

*Show: status changes to "Completed". The green transaction hash banner appears linking to stellar.expert.*

---

### [1:08 – 1:20] Stellar Explorer + Transaction Hash

*Action:* Click the transaction hash link in the banner. Switch to the stellar.expert tab.

> "Here's the transaction on Stellar Expert. You can see the contract invocations — including the cross-contract call from the bounty contract to the reputation contract."

*Show: stellar.expert transaction detail page.*

---

### [1:20 – 1:35] CI Pipeline + Tests

*Action:* Switch to the GitHub Actions tab.

> "The CI pipeline runs on every push. It installs Rust 1.81, compiles both contracts, runs 10 unit tests — including the inter-contract test — builds the WASM binaries, then runs TypeScript checks and 9 frontend tests."

*Show: both jobs passing with green checkmarks.*

*Action:* Click into the contracts job to show the test output with "6 passed" and "4 passed".*

---

### [1:35 – 1:45] Wrap Up

> "Stellar Bounty Board demonstrates advanced Soroban development: two communicating contracts, access-control enforcement, event-based real-time polling, a fully wired React frontend, automated tests on both layers, and a complete CI/CD pipeline. Links in the README."

*Show: README on GitHub with contract addresses and live demo link.*

---

## Recording Checklist

- [ ] Mobile responsive UI shown (switch device mode at 0:12)
- [ ] Wallet connection demonstrated (0:22)
- [ ] Real blockchain transaction created (0:35) — NOT demo mode
- [ ] Freighter signing popup visible
- [ ] Transaction hash / stellar.expert link visible (1:08)
- [ ] CI pipeline green checkmarks visible (1:20)
- [ ] Test output (10 passing tests) visible (1:25)
- [ ] Audio is clear with no background noise
- [ ] Total length: 60–120 seconds
