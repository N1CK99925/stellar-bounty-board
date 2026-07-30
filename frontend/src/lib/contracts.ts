import * as StellarSdk from "@stellar/stellar-sdk";
import type { Bounty, BountyStatus } from "./types";

/**
 * Deployment configuration.
 *
 * These are read from environment variables so the same build can point
 * at testnet, futurenet, or a local network without code changes. Fill in
 * your own values in `.env` (see `.env.example`) once you deploy the
 * contracts described in `contracts/`.
 */
export const CONFIG = {
  rpcUrl:
    import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  networkPassphrase:
    import.meta.env.VITE_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET,
  bountyContractId: import.meta.env.VITE_BOUNTY_CONTRACT_ID || "",
  reputationContractId: import.meta.env.VITE_REPUTATION_CONTRACT_ID || "",
};

export class ContractCallError extends Error {}

function assertConfigured() {
  if (!CONFIG.bountyContractId) {
    throw new ContractCallError(
      "The bounty contract address is not configured. Set VITE_BOUNTY_CONTRACT_ID in your .env file after deploying the contract.",
    );
  }
}

function statusFromEnum(raw: unknown): BountyStatus {
  if (typeof raw === "string") return raw as BountyStatus;
  if (raw && typeof raw === "object") {
    const key = Object.keys(raw as Record<string, unknown>)[0];
    if (key) return key as BountyStatus;
  }
  return "Open";
}

/**
 * Fetches a single bounty from the deployed contract via a simulated
 * (read-only) transaction, which does not require signing or spending fees.
 */
export async function fetchBounty(id: number): Promise<Bounty | null> {
  assertConfigured();

  const server = new StellarSdk.rpc.Server(CONFIG.rpcUrl);
  const contract = new StellarSdk.Contract(CONFIG.bountyContractId);

  // A read-only simulation account is enough for a `simulateTransaction`
  // call; it never needs a real signature or balance.
  const account = new StellarSdk.Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "0",
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(contract.call("get_bounty", StellarSdk.nativeToScVal(id, { type: "u64" })))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    throw new ContractCallError(simulated.error);
  }

  if (!simulated.result?.retval) {
    return null;
  }

  const decoded = StellarSdk.scValToNative(simulated.result.retval);
  if (!decoded) return null;

  // Fetch the claimer separately (stored under BountyClaimer(id) key)
  let claimer: string | null = null;
  try {
    const claimerResult = await fetchClaimer(id);
    claimer = claimerResult;
  } catch {
    // ignore — no claimer set yet
  }

  return {
    id: Number(decoded.id),
    creator: decoded.creator,
    claimer,
    amount: Number(decoded.amount),
    description: decoded.description,
    status: statusFromEnum(decoded.status),
  };
}

/**
 * Fetches the claimer address for a bounty (stored separately from the bounty struct).
 */
export async function fetchClaimer(id: number): Promise<string | null> {
  assertConfigured();

  const server = new StellarSdk.rpc.Server(CONFIG.rpcUrl);
  const contract = new StellarSdk.Contract(CONFIG.bountyContractId);
  const account = new StellarSdk.Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "0",
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(contract.call("get_claimer", StellarSdk.nativeToScVal(id, { type: "u64" })))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simulated)) return null;
  if (!simulated.result?.retval) return null;

  const decoded = StellarSdk.scValToNative(simulated.result.retval);
  return decoded ? String(decoded) : null;
}

/**
 * Fetches the reputation score for a given address.
 */
export async function fetchReputationScore(address: string): Promise<number> {
  if (!CONFIG.reputationContractId) return 0;

  const server = new StellarSdk.rpc.Server(CONFIG.rpcUrl);
  const contract = new StellarSdk.Contract(CONFIG.reputationContractId);
  const account = new StellarSdk.Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "0",
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "get_reputation",
        StellarSdk.Address.fromString(address).toScVal(),
      ),
    )
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simulated)) return 0;
  if (!simulated.result?.retval) return 0;

  const decoded = StellarSdk.scValToNative(simulated.result.retval);
  return Number(decoded) || 0;
}

/**
 * Queries the bounty contract event log for recent bounty-creation events.
 * Returns a deduplicated list of bounty IDs seen in the last ~1000 ledgers.
 *
 * This is the legitimate real-time/polling mechanism supported by Soroban RPC.
 * Pure WebSocket event streaming is not yet available in the stable SDK;
 * polling via getEvents() is the recommended approach for dApp UIs.
 */
export async function fetchBountyIdsFromEvents(
  startLedger?: number,
): Promise<number[]> {
  assertConfigured();

  const server = new StellarSdk.rpc.Server(CONFIG.rpcUrl);

  // If no start ledger given, look back ~1000 ledgers (~83 minutes on testnet)
  let ledger = startLedger;
  if (!ledger) {
    try {
      const info = await server.getLatestLedger();
      ledger = Math.max(1, info.sequence - 1000);
    } catch {
      return [];
    }
  }

  try {
    // Filter by contractId only — topic-level filtering varies by SDK version.
    // We match b_create events in JS below, which is safe and avoids XDR
    // encoding type issues across SDK versions.
    const response = await server.getEvents({
      startLedger: ledger,
      filters: [
        {
          type: "contract",
          contractIds: [CONFIG.bountyContractId],
        },
      ],
    });

    const bCreateSymbol = "b_create";
    const ids = new Set<number>();

    for (const event of response.events) {
      // In stellar-sdk v14+, event.topic is xdr.ScVal[] (already decoded).
      // topic[0] = event symbol, topic[1] = bounty id (u64)
      if (!event.topic || event.topic.length < 2) continue;
      try {
        const sym = StellarSdk.scValToNative(event.topic[0]);
        if (sym !== bCreateSymbol) continue;
        const idVal = StellarSdk.scValToNative(event.topic[1]);
        ids.add(Number(idVal));
      } catch {
        // skip malformed events
      }
    }
    return Array.from(ids);
  } catch {
    return [];
  }
}

/**
 * Builds an unsigned transaction that calls `create_bounty`. The caller is
 * responsible for signing it with the connected wallet (see `lib/wallet.ts`)
 * and submitting it to the network.
 */
export function buildCreateBountyTx(params: {
  sourcePublicKey: string;
  sourceSequence: string;
  id: number;
  amount: number;
  description: string;
}): StellarSdk.Transaction {
  assertConfigured();

  const contract = new StellarSdk.Contract(CONFIG.bountyContractId);
  const account = new StellarSdk.Account(params.sourcePublicKey, params.sourceSequence);

  return new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "create_bounty",
        StellarSdk.Address.fromString(params.sourcePublicKey).toScVal(),
        StellarSdk.nativeToScVal(params.id, { type: "u64" }),
        StellarSdk.nativeToScVal(params.amount, { type: "i128" }),
        StellarSdk.nativeToScVal(params.description, { type: "string" }),
      ),
    )
    .setTimeout(60)
    .build();
}

/**
 * Builds an unsigned transaction that calls `claim_bounty`.
 */
export function buildClaimBountyTx(params: {
  sourcePublicKey: string;
  sourceSequence: string;
  id: number;
}): StellarSdk.Transaction {
  assertConfigured();

  const contract = new StellarSdk.Contract(CONFIG.bountyContractId);
  const account = new StellarSdk.Account(params.sourcePublicKey, params.sourceSequence);

  return new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "claim_bounty",
        StellarSdk.Address.fromString(params.sourcePublicKey).toScVal(),
        StellarSdk.nativeToScVal(params.id, { type: "u64" }),
      ),
    )
    .setTimeout(60)
    .build();
}

/**
 * Builds an unsigned transaction that calls `complete_bounty`.
 */
export function buildCompleteBountyTx(params: {
  sourcePublicKey: string;
  sourceSequence: string;
  id: number;
}): StellarSdk.Transaction {
  assertConfigured();

  const contract = new StellarSdk.Contract(CONFIG.bountyContractId);
  const account = new StellarSdk.Account(params.sourcePublicKey, params.sourceSequence);

  return new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "complete_bounty",
        StellarSdk.Address.fromString(params.sourcePublicKey).toScVal(),
        StellarSdk.nativeToScVal(params.id, { type: "u64" }),
      ),
    )
    .setTimeout(60)
    .build();
}

/**
 * Prepares (simulates) a transaction and returns the resource-fee-augmented
 * version ready for signing. Throws ContractCallError on simulation failure.
 */
export async function prepareTransaction(
  tx: StellarSdk.Transaction,
): Promise<StellarSdk.Transaction> {
  const server = new StellarSdk.rpc.Server(CONFIG.rpcUrl);
  const prepared = await server.prepareTransaction(tx);
  return prepared as StellarSdk.Transaction;
}

/**
 * Submits a signed transaction XDR and waits for confirmation.
 * Returns the transaction hash.
 */
export async function submitTransaction(signedXdr: string): Promise<string> {
  const server = new StellarSdk.rpc.Server(CONFIG.rpcUrl);
  const tx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    CONFIG.networkPassphrase,
  );
  const result = await server.sendTransaction(tx);

  if (result.status === "ERROR") {
    throw new ContractCallError(
      `Transaction failed: ${result.errorResult?.toXDR("base64") ?? "unknown error"}`,
    );
  }

  // Poll for completion
  const hash = result.hash;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await server.getTransaction(hash);
    if (status.status === "SUCCESS") return hash;
    if (status.status === "FAILED") {
      throw new ContractCallError(`Transaction ${hash} failed on-chain.`);
    }
  }

  throw new ContractCallError(`Transaction ${hash} timed out waiting for confirmation.`);
}
