import { useCallback, useEffect, useRef, useState } from "react";
import { rpc as StellarRpc } from "@stellar/stellar-sdk";
import { BountyCard } from "./components/BountyCard";
import { CreateBountyForm } from "./components/CreateBountyForm";
import { ErrorBanner } from "./components/ErrorBanner";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { WalletButton } from "./components/WalletButton";
import { connectWallet, signTx, WalletError } from "./lib/wallet";
import {
  CONFIG,
  ContractCallError,
  buildCreateBountyTx,
  buildClaimBountyTx,
  buildCompleteBountyTx,
  fetchBounty,
  fetchBountyIdsFromEvents,
  prepareTransaction,
  submitTransaction,
} from "./lib/contracts";
import { MOCK_BOUNTIES } from "./lib/mockData";
import type { Bounty } from "./lib/types";

const isDemoMode = !CONFIG.bountyContractId;

/** Polling interval in ms for refreshing bounty state in production mode. */
const POLL_INTERVAL_MS = 12_000;

export default function App() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Track the start ledger for event polling so we don't re-fetch the
  // entire history on every poll cycle.
  const pollLedgerRef = useRef<number | undefined>(undefined);
  const knownIdsRef = useRef<Set<number>>(new Set());

  /** Loads bounties from the live contract or from mock data in demo mode. */
  const loadBounties = useCallback(async () => {
    if (isDemoMode) {
      // Simulate network latency so loading state is visible in demo mode.
      await new Promise((r) => setTimeout(r, 400));
      setBounties(MOCK_BOUNTIES);
      setLoading(false);
      return;
    }

    try {
      // Discover bounty IDs via contract events, then fetch each bounty.
      const ids = await fetchBountyIdsFromEvents(pollLedgerRef.current);
      const newIds = ids.filter((id) => !knownIdsRef.current.has(id));

      if (newIds.length > 0) {
        const fetched = await Promise.all(
          newIds.map((id) => fetchBounty(id).catch(() => null)),
        );
        const valid = fetched.filter(Boolean) as Bounty[];
        for (const id of newIds) knownIdsRef.current.add(id);
        setBounties((prev) => {
          // Merge: update existing, append new
          const map = new Map(prev.map((b) => [b.id, b]));
          for (const b of valid) map.set(b.id, b);
          return Array.from(map.values()).sort((a, b) => b.id - a.id);
        });
      }

      // Also refresh known bounties in case their status changed.
      if (knownIdsRef.current.size > 0) {
        const refreshed = await Promise.all(
          Array.from(knownIdsRef.current).map((id) =>
            fetchBounty(id).catch(() => null),
          ),
        );
        const valid = refreshed.filter(Boolean) as Bounty[];
        setBounties((prev) => {
          const map = new Map(prev.map((b) => [b.id, b]));
          for (const b of valid) map.set(b.id, b);
          return Array.from(map.values()).sort((a, b) => b.id - a.id);
        });
      }
    } catch (err) {
      setError(
        err instanceof ContractCallError || err instanceof Error
          ? err.message
          : "Failed to load bounties.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadBounties().then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [loadBounties]);

  // Polling for real-time updates (production mode only)
  useEffect(() => {
    if (isDemoMode) return;

    const interval = setInterval(() => {
      loadBounties();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loadBounties]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
    } catch (err) {
      setError(
        err instanceof WalletError
          ? err.message
          : "Something went wrong connecting your wallet.",
      );
    } finally {
      setConnecting(false);
    }
  }

  async function handleCreate(values: {
    id: number;
    amount: number;
    description: string;
  }) {
    if (!walletAddress) {
      setError("Connect your wallet before posting a bounty.");
      return;
    }

    if (isDemoMode) {
      // Demo-mode local update
      const newBounty: Bounty = {
        id: values.id,
        creator: walletAddress,
        claimer: null,
        amount: values.amount,
        description: values.description,
        status: "Open",
      };
      setBounties((prev) => [newBounty, ...prev]);
      return;
    }

    setBusyId(values.id);
    setError(null);
    setTxHash(null);
    try {
      const server = new StellarRpc.Server(CONFIG.rpcUrl);
      const accountInfo = await server.getAccount(walletAddress);
      const tx = buildCreateBountyTx({
        sourcePublicKey: walletAddress,
        sourceSequence: accountInfo.sequenceNumber().toString(),
        id: values.id,
        amount: values.amount,
        description: values.description,
      });
      const prepared = await prepareTransaction(tx);
      const signed = await signTx(prepared.toXDR(), CONFIG.networkPassphrase);
      const hash = await submitTransaction(signed);
      setTxHash(hash);
      // Refresh to pick up the new bounty
      await loadBounties();
    } catch (err) {
      setError(
        err instanceof WalletError || err instanceof ContractCallError || err instanceof Error
          ? err.message
          : "Could not create bounty.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleClaim(id: number) {
    if (!walletAddress) {
      setError("Connect your wallet before claiming a bounty.");
      return;
    }

    setBusyId(id);
    setError(null);
    setTxHash(null);

    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 300));
      setBounties((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "Claimed", claimer: walletAddress } : b,
        ),
      );
      setBusyId(null);
      return;
    }

    try {
      const server = new StellarRpc.Server(CONFIG.rpcUrl);
      const accountInfo = await server.getAccount(walletAddress);
      const tx = buildClaimBountyTx({
        sourcePublicKey: walletAddress,
        sourceSequence: accountInfo.sequenceNumber().toString(),
        id,
      });
      const prepared = await prepareTransaction(tx);
      const signed = await signTx(prepared.toXDR(), CONFIG.networkPassphrase);
      const hash = await submitTransaction(signed);
      setTxHash(hash);
      await loadBounties();
    } catch (err) {
      setError(
        err instanceof WalletError || err instanceof ContractCallError || err instanceof Error
          ? err.message
          : "Could not claim bounty.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(id: number) {
    if (!walletAddress) {
      setError("Connect your wallet before marking a bounty complete.");
      return;
    }

    setBusyId(id);
    setError(null);
    setTxHash(null);

    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 300));
      setBounties((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "Completed" } : b)),
      );
      setBusyId(null);
      return;
    }

    try {
      const server = new StellarRpc.Server(CONFIG.rpcUrl);
      const accountInfo = await server.getAccount(walletAddress);
      const tx = buildCompleteBountyTx({
        sourcePublicKey: walletAddress,
        sourceSequence: accountInfo.sequenceNumber().toString(),
        id,
      });
      const prepared = await prepareTransaction(tx);
      const signed = await signTx(prepared.toXDR(), CONFIG.networkPassphrase);
      const hash = await submitTransaction(signed);
      setTxHash(hash);
      await loadBounties();
    } catch (err) {
      setError(
        err instanceof WalletError || err instanceof ContractCallError || err instanceof Error
          ? err.message
          : "Could not complete bounty.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              Stellar Bounty Board
            </h1>
            <p className="text-xs text-slate-500">
              Post tasks, claim work, get paid on Stellar/Soroban.
            </p>
          </div>
          <WalletButton
            address={walletAddress}
            connecting={connecting}
            onConnect={handleConnect}
          />
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        {isDemoMode && (
          <div
            data-testid="demo-mode-banner"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            Demo mode: showing sample data. Deploy the contracts and set
            VITE_BOUNTY_CONTRACT_ID to connect this UI to a live network.
          </div>
        )}

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {txHash && (
          <div
            data-testid="tx-hash-banner"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            ✅ Transaction confirmed:{" "}
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline hover:text-emerald-900"
            >
              {txHash.slice(0, 16)}…
            </a>{" "}
            <button
              onClick={() => setTxHash(null)}
              className="ml-2 font-medium hover:text-emerald-900"
              aria-label="Dismiss transaction notification"
            >
              Dismiss
            </button>
          </div>
        )}

        <CreateBountyForm onSubmit={handleCreate} disabled={!!busyId} />

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Open &amp; active bounties
          </h2>

          {loading && <LoadingSpinner label="Loading bounties..." />}

          {!loading && bounties.length === 0 && (
            <p className="text-sm text-slate-500">
              No bounties yet. Be the first to post one above.
            </p>
          )}

          {!loading &&
            bounties.map((bounty) => (
              <BountyCard
                key={bounty.id}
                bounty={bounty}
                busy={busyId === bounty.id}
                onClaim={handleClaim}
                onComplete={handleComplete}
              />
            ))}
        </section>

        {!isDemoMode && (
          <p className="text-center text-xs text-slate-400">
            State refreshes every {POLL_INTERVAL_MS / 1000}s via Soroban RPC event
            polling.{" "}
            <button
              onClick={() => loadBounties()}
              className="underline hover:text-slate-600"
            >
              Refresh now
            </button>
          </p>
        )}
      </main>
    </div>
  );
}
