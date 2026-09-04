// Which namespaces to actually connect for a given wallet type.
//
// Why this exists: MetaMask's multichain rollout made the MetaMask tile
// advertise BOTH "EVM" and "Solana" namespaces. Rango's MetaMask-Solana
// connect path expects a Snap/instance that often isn't usable, and the
// attempt never settles — which keeps the whole wallet in "connecting"
// until the 60s watchdog resets it, even though the EVM connect itself was
// fine. (It also leaks an unhandled rejection from inside Rango.)
//
// Solana on Dexifier is served by the Phantom/Solflare tiles, so MetaMask
// connects EVM only. Other wallets keep whatever namespaces they advertise.
import type { Namespace } from "@hub3js/namespaces";

const isEvmNamespace = (namespace: Namespace): boolean =>
  /^(evm|eip155)$/i.test(String(namespace));

/**
 * Namespaces to connect for `walletType`, given what the wallet advertises.
 * MetaMask is pinned to EVM (see header). If filtering would leave nothing
 * (a future MetaMask that no longer advertises EVM), the original list is
 * returned unchanged — connecting something is better than nothing.
 */
export const connectNamespacesFor = (
  walletType: string,
  namespaces: Namespace[],
): Namespace[] => {
  if (walletType !== "metamask") return namespaces;
  const evmOnly = namespaces.filter(isEvmNamespace);
  return evmOnly.length > 0 ? evmOnly : namespaces;
};
