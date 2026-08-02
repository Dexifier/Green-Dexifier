// Wallet connection pre-flight.
//
// Rango's hub leaves a wallet in the "connecting" state until its extension
// answers. Locked wallets are the classic failure: MetaMask's popup can be
// missed, and TronLink doesn't even inject accounts until unlocked — so the
// hub waits forever and the tile spins on "connecting" indefinitely.
//
// The fix: BEFORE handing off to Rango, fire the wallet's own interactive
// unlock/connect request ourselves. That reliably pops the extension open
// when locked, resolves instantly when already unlocked, and rejects fast
// when the user declines — so a failed attempt never parks in "connecting".

export const PREFLIGHT_TIMEOUT_MS = 60_000;

export class WalletPreflightError extends Error {}

export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new WalletPreflightError(`${label} timed out`)), ms),
    ),
  ]);

// MetaMask may share window.ethereum with other extensions (or sit in the
// .providers array when several EVM wallets are installed).
const getMetaMaskProvider = (): any => {
  if (typeof window === "undefined") return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers)) {
    return eth.providers.find((p: any) => p?.isMetaMask) ?? null;
  }
  return eth.isMetaMask ? eth : null;
};

const getPhantomProvider = (): any => {
  if (typeof window === "undefined") return null;
  const phantom = (window as any).phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  const solana = (window as any).solana;
  return solana?.isPhantom ? solana : null;
};

const getTronLinkProvider = (): any => {
  if (typeof window === "undefined") return null;
  return (window as any).tronLink ?? null;
};

/**
 * Fire the wallet's own unlock prompt. Resolves when the wallet is unlocked
 * and usable; throws WalletPreflightError (or the wallet's own rejection)
 * when the user declines or nothing answers in time.
 * Unknown wallets are a no-op — their flow is handled by Rango directly.
 */
export const preflightWalletUnlock = async (walletType: string): Promise<void> => {
  if (walletType === "metamask") {
    const metamask = getMetaMaskProvider();
    if (metamask?.request) {
      await withTimeout(
        metamask.request({ method: "eth_requestAccounts" }),
        PREFLIGHT_TIMEOUT_MS,
        "MetaMask",
      );
    }
    return;
  }

  if (walletType === "phantom") {
    const phantom = getPhantomProvider();
    if (phantom?.connect) {
      // Interactive connect: pops the unlock screen when locked, resolves
      // silently when the dapp is already trusted and unlocked.
      await withTimeout(phantom.connect(), PREFLIGHT_TIMEOUT_MS, "Phantom");
    }
    return;
  }

  if (walletType === "tron-link") {
    const tronLink = getTronLinkProvider();
    if (tronLink?.request) {
      // TronLink doesn't inject accounts while locked — this forces its popup.
      // Unlike most wallets it RESOLVES with an error code instead of rejecting.
      const result = await withTimeout(
        tronLink.request({ method: "tron_requestAccounts" }),
        PREFLIGHT_TIMEOUT_MS,
        "TronLink",
      );
      if (result && typeof result === "object" && "code" in result && result.code !== 200) {
        throw new WalletPreflightError(
          `TronLink declined: ${(result as any).message ?? result.code}`,
        );
      }
    }
    return;
  }
  // Every other wallet type: nothing to pre-flight.
};
