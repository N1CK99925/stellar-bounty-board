interface WalletButtonProps {
  address: string | null;
  connecting: boolean;
  onConnect: () => void;
}

function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

export function WalletButton({ address, connecting, onConnect }: WalletButtonProps) {
  if (address) {
    return (
      <span
        data-testid="wallet-address"
        className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
      >
        {shortenAddress(address)}
      </span>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={connecting}
      data-testid="connect-wallet-button"
      className="rounded-lg bg-stellar-purple px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
