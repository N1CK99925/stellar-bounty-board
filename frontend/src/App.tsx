import { useEffect, useState } from "react";
import { BountyCard } from "./components/BountyCard";
import { CreateBountyForm } from "./components/CreateBountyForm";
import { ErrorBanner } from "./components/ErrorBanner";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { WalletButton } from "./components/WalletButton";
import { connectWallet, WalletError } from "./lib/wallet";
import { CONFIG } from "./lib/contracts";
import { MOCK_BOUNTIES } from "./lib/mockData";
import type { Bounty } from "./lib/types";

const isDemoMode = !CONFIG.bountyContractId;

export default function App() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // In demo mode (no contract configured yet) we show sample data so
        // the UI is fully explorable. Once VITE_BOUNTY_CONTRACT_ID is set,
        // wire this up to `fetchBounty` from lib/contracts.ts for each
        // known bounty id, or track ids via the `b_create` contract event.
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (!cancelled) {
          setBounties(isDemoMode ? MOCK_BOUNTIES : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load bounties.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  function handleCreate(values: { id: number; amount: number; description: string }) {
    if (!walletAddress) {
      setError("Connect your wallet before posting a bounty.");
      return;
    }
    const newBounty: Bounty = {
      id: values.id,
      creator: walletAddress,
      claimer: null,
      amount: values.amount,
      description: values.description,
      status: "Open",
    };
    // Demo-mode local update. With a deployed contract, build and submit a
    // `create_bounty` transaction here (see buildCreateBountyTx) and only
    // update local state after the transaction is confirmed.
    setBounties((prev) => [newBounty, ...prev]);
  }

  async function handleClaim(id: number) {
    if (!walletAddress) {
      setError("Connect your wallet before claiming a bounty.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setBounties((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "Claimed", claimer: walletAddress } : b,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not claim bounty.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setBounties((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "Completed" } : b)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete bounty.");
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

        <CreateBountyForm onSubmit={handleCreate} />

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
      </main>
    </div>
  );
}
