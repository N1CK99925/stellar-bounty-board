import {
  isConnected as freighterIsConnected,
  isAllowed,
  setAllowed,
  getAddress,
  getNetwork,
  signTransaction,
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

/**
 * Signs a transaction XDR with the Freighter wallet and returns the signed XDR.
 * Throws a WalletError if the user rejects the transaction or Freighter is unavailable.
 */
export async function signTx(
  txXdr: string,
  networkPassphrase: string,
): Promise<string> {
  const result = await signTransaction(txXdr, {
    networkPassphrase,
  });

  if (result.error) {
    if (
      result.error.message?.toLowerCase().includes("user") ||
      result.error.message?.toLowerCase().includes("cancel") ||
      result.error.message?.toLowerCase().includes("reject") ||
      result.error.message?.toLowerCase().includes("denied")
    ) {
      throw new WalletError("Transaction was rejected in Freighter.");
    }
    throw new WalletError(
      result.error.message || "Failed to sign the transaction in Freighter.",
    );
  }

  if (!result.signedTxXdr) {
    throw new WalletError("Freighter did not return a signed transaction.");
  }

  return result.signedTxXdr;
}
