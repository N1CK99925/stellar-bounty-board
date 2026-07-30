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
  rpcUrl: import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
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

  return {
    id: Number(decoded.id),
    creator: decoded.creator,
    claimer: null,
    amount: Number(decoded.amount),
    description: decoded.description,
    status: statusFromEnum(decoded.status),
  };
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
