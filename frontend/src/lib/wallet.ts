import {
  isConnected as freighterIsConnected,
  isAllowed,
  setAllowed,
  getAddress,
  getNetwork,
} from "@stellar/freighter-api";

export class WalletError extends Error {}

/**
 * Connects to the Freighter browser extension wallet.
 * Throws a WalletError with a human readable message on any failure so the
 * UI can surface it instead of crashing.
 */
export async function connectWallet(): Promise<{
  address: string;
  network: string;
}> {
  const connected = await freighterIsConnected();
  if (!connected.isConnected) {
    throw new WalletError(
      "Freighter wallet extension was not detected. Install it from freighter.app and refresh the page.",
    );
  }

  const allowed = await isAllowed();
  if (!allowed.isAllowed) {
    const permission = await setAllowed();
    if (!permission.isAllowed) {
      throw new WalletError(
        "Wallet access was not granted. Please allow this site in Freighter to continue.",
      );
    }
  }

  const addressResult = await getAddress();
  if (addressResult.error || !addressResult.address) {
    throw new WalletError(
      addressResult.error?.message || "Could not retrieve a wallet address.",
    );
  }

  const networkResult = await getNetwork();
  if (networkResult.error) {
    throw new WalletError(
      networkResult.error?.message || "Could not read the active network.",
    );
  }

  return {
    address: addressResult.address,
    network: networkResult.network || "UNKNOWN",
  };
}
