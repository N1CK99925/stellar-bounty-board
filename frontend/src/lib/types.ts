export type BountyStatus = "Open" | "Claimed" | "Completed" | "Cancelled";

export interface Bounty {
  id: number;
  creator: string;
  claimer: string | null;
  amount: number;
  description: string;
  status: BountyStatus;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  network: string | null;
}
