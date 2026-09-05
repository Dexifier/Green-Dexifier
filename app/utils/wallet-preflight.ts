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
//
// Coverage: every injected wallet Rango lists that has a known unlock API.
// Wallets without one (WalletConnect QR, TON Connect, Ledger/Trezor bridges,
// Starknet/Bitcoin wallets) fall through to Rango — the 60s watchdog in the
// connect modal still guarantees they can't hang silently.

export const PREFLIGHT_TIMEOUT_MS = 60_000;

export class WalletPreflightError extends Error {}

// Thrown when a wallet is positively known to be LOCKED before we fire any
// interactive request — the caller can tell the user to unlock first instead
// of waiting out a timeout.
export class WalletLockedError extends WalletPreflightError {}

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

/* ---------------------------------- EVM ---------------------------------- */

// Find an EVM provider by its identity flag, checking window.ethereum and the
// .providers array used when several EVM extensions coexist.
const evmProviderByFlag = (flag: string): any => {
  if (typeof window === "undefined") return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers)) {
    return eth.providers.find((p: any) => p?.[flag]) ?? null;
  }
  return eth[flag] ? eth : null;
};

// Several wallets spoof `isMetaMask` on their own injected provider for dapp
// compatibility — Phantom's EVM provider is the common one in the wild. When
// such a wallet also owns window.ethereum, naive flag checks hand MetaMask's
// connect to the wrong wallet. Identify MetaMask strictly: isMetaMask AND
// none of the known impostor flags (mirrors Rango's blocklist, + Phantom).
const METAMASK_IMPOSTOR_FLAGS = [
  "isPhantom", "isBraveWallet", "isRabby", "isCoinbaseWallet", "isBitKeep",
  "isOkxWallet", "isOKExWallet", "isTokenPocket", "isSafePal", "isCoin98",
  "isMathWallet", "isExodus", "isTally", "isTrust", "isTrustWallet",
  "isApexWallet", "isAvalanche", "isBlockWallet", "isFordefi", "__XDEFI",
  "isOneInchIOSWallet", "isOneInchAndroidWallet", "isOpera", "isPortal",
  "isDefiant", "isTokenary", "isZeal", "isZerion",
];

export const isStrictMetaMask = (provider: any): boolean =>
  !!provider?.isMetaMask &&
  !METAMASK_IMPOSTOR_FLAGS.some((flag) => provider?.[flag]);

// The real MetaMask provider, or null when it isn't injected. Checks the
// .providers array (multi-wallet installs) before window.ethereum itself.
export const findMetaMaskProvider = (): any => {
  if (typeof window === "undefined") return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers)) {
    const found = eth.providers.find(isStrictMetaMask);
    if (found) return found;
  }
  return isStrictMetaMask(eth) ? eth : null;
};

// Rango's MetaMask provider reads window.ethereum ONLY (no .providers array,
// no EIP-6963), so when an impostor owns window.ethereum the MetaMask tile
// connects to the wrong wallet. While we run MetaMask's connect, point
// window.ethereum at the strictly-identified MetaMask, then restore. The hub
// captures the provider reference during connect, so restoring afterwards is
// safe. No-op when MetaMask isn't installed or already owns window.ethereum.
export const withMetaMaskProviderOverride = async <T>(
  fn: () => Promise<T>,
): Promise<T> => {
  if (typeof window === "undefined") return fn();
  const real = findMetaMaskProvider();
  const current = (window as any).ethereum;
  if (!real || !current || current === real || isStrictMetaMask(current)) {
    return fn();
  }
  try {
    (window as any).ethereum = real;
  } catch {
    return fn(); // non-writable injection point — connect as-is
  }
  try {
    return await fn();
  } finally {
    try {
      (window as any).ethereum = current;
    } catch {
      // nothing sane to do — leave the corrected assignment in place
    }
  }
};

// MetaMask 13 drops a pending eth_requestAccounts when the user unlocks from
// the popup that the request itself opened: the promise never settles and no
// approval screen ever appears, so a connect attempted while locked hangs
// until timeout (verified against the real MetaMask 13.47 extension).
// Detect the locked state NON-interactively first — `_metamask.isUnlocked()`
// has shipped on MetaMask's inpage provider since v8 and answers instantly
// even while locked — and refuse to fire the droppable interactive request.
// Returns false whenever the lock state can't be determined (unknown state
// must never block a connect attempt).
export const isMetaMaskLocked = async (): Promise<boolean> => {
  const provider = findMetaMaskProvider();
  const isUnlocked = provider?._metamask?.isUnlocked;
  if (typeof isUnlocked !== "function") return false;
  try {
    return !(await withTimeout(
      isUnlocked.call(provider._metamask),
      5_000,
      "MetaMask lock check",
    ));
  } catch {
    return false;
  }
};

const w = (path: string): any => {
  if (typeof window === "undefined") return null;
  return path.split(".").reduce((obj: any, key) => obj?.[key], window as any) ?? null;
};

// wallet type -> injected EVM provider, using the same well-known injection
// points the wallets document (and wagmi/RainbowKit rely on). Positively
// identified only — anything uncertain returns null and skips pre-flight.
const EVM_INJECTIONS: Record<string, () => any> = {
  // MetaMask must be strictly identified — impostor wallets spoof isMetaMask.
  "metamask": () => findMetaMaskProvider(),
  "trust-wallet": () => w("trustwallet") ?? evmProviderByFlag("isTrust") ?? evmProviderByFlag("isTrustWallet"),
  "brave": () => w("braveEthereum") ?? evmProviderByFlag("isBraveWallet"),
  "rabby": () => evmProviderByFlag("isRabby"),
  "coinbase": () => w("coinbaseWalletExtension") ?? evmProviderByFlag("isCoinbaseWallet"),
  "bitget": () => w("bitkeep.ethereum") ?? evmProviderByFlag("isBitKeep"),
  "okx": () => w("okxwallet") ?? evmProviderByFlag("isOKExWallet") ?? evmProviderByFlag("isOkxWallet"),
  "exodus": () => w("exodus.ethereum") ?? evmProviderByFlag("isExodus"),
  "taho": () => w("tally") ?? evmProviderByFlag("isTally"),
  "math": () => evmProviderByFlag("isMathWallet"),
  "token-pocket": () => w("tokenpocket") ?? evmProviderByFlag("isTokenPocket"),
  "safepal": () => w("safepal") ?? evmProviderByFlag("isSafePal"),
  "coin98": () => w("coin98") ?? evmProviderByFlag("isCoin98"),
};

/* --------------------------------- Solana --------------------------------- */

const getPhantomProvider = (): any => {
  const phantom = w("phantom.solana");
  if (phantom?.isPhantom) return phantom;
  const solana = w("solana");
  return solana?.isPhantom ? solana : null;
};

const getSolflareProvider = (): any => {
  const solflare = w("solflare");
  return solflare?.isSolflare ? solflare : null;
};

/* ---------------------------------- Tron ---------------------------------- */

const getTronLinkProvider = (): any => w("tronLink");

/* ------------------------------ pre-flight -------------------------------- */

/**
 * Fire the wallet's own unlock prompt. Resolves when the wallet is unlocked
 * and usable; throws WalletPreflightError (or the wallet's own rejection)
 * when the user declines or nothing answers in time.
 * Wallets we can't positively identify are a no-op — their flow is handled
 * by Rango directly, still guarded by the connect modal's watchdog.
 */
export const preflightWalletUnlock = async (walletType: string): Promise<void> => {
  // MetaMask: a locked MetaMask swallows interactive requests (see above), so
  // refuse early with a dedicated error instead of stalling for 60s.
  if (walletType === "metamask" && (await isMetaMaskLocked())) {
    throw new WalletLockedError("MetaMask is locked");
  }

  // EVM family: one shared unlock request
  const evmLookup = EVM_INJECTIONS[walletType];
  if (evmLookup) {
    const provider = evmLookup();
    if (provider?.request) {
      await withTimeout(
        provider.request({ method: "eth_requestAccounts" }),
        PREFLIGHT_TIMEOUT_MS,
        walletType,
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

  if (walletType === "solflare") {
    const solflare = getSolflareProvider();
    if (solflare?.connect) {
      await withTimeout(solflare.connect(), PREFLIGHT_TIMEOUT_MS, "Solflare");
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
  // WalletConnect / TON Connect / Ledger / Trezor / Starknet / Bitcoin
  // wallets: no injected unlock API — Rango drives their (modal-based) flow,
  // and the connect watchdog covers any hang.
};
