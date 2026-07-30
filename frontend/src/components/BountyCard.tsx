import type { Bounty } from "../lib/types";

const STATUS_STYLES: Record<string, string> = {
  Open: "bg-emerald-100 text-emerald-800",
  Claimed: "bg-amber-100 text-amber-800",
  Completed: "bg-blue-100 text-blue-800",
  Cancelled: "bg-gray-200 text-gray-600",
};

function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

interface BountyCardProps {
  bounty: Bounty;
  onClaim?: (id: number) => void;
  onComplete?: (id: number) => void;
  busy?: boolean;
}

export function BountyCard({ bounty, onClaim, onComplete, busy }: BountyCardProps) {
  return (
    <div
      data-testid={`bounty-card-${bounty.id}`}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
          {bounty.description}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            STATUS_STYLES[bounty.status] ?? STATUS_STYLES.Open
          }`}
        >
          {bounty.status}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
        <span>
          Reward: <span className="font-medium text-slate-800">{bounty.amount} XLM</span>
        </span>
        <span>Creator: {shortenAddress(bounty.creator)}</span>
        {bounty.claimer && <span>Claimer: {shortenAddress(bounty.claimer)}</span>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {bounty.status === "Open" && onClaim && (
          <button
            onClick={() => onClaim(bounty.id)}
            disabled={busy}
            className="w-full rounded-lg bg-stellar-purple px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {busy ? "Submitting..." : "Claim bounty"}
          </button>
        )}
        {bounty.status === "Claimed" && onComplete && (
          <button
            onClick={() => onComplete(bounty.id)}
            disabled={busy}
            className="w-full rounded-lg bg-stellar-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {busy ? "Submitting..." : "Mark completed"}
          </button>
        )}
      </div>
    </div>
  );
}
