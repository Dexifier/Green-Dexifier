// Chain ordering for the token selector: the user's recently used chains
// first, then a fixed curated popularity list (no live computation — cheap
// and deterministic), then everything else alphabetically.
import type { Blockchain } from "@/app/types/dexifier";

export const POPULAR_CHAINS: readonly string[] = [
  "BTC",
  "ETH",
  "SOLANA",
  "XMR",
  "BSC",
  "BASE",
  "ARBITRUM",
  "TRON",
  "OPTIMISM",
  "POLYGON",
  "TON",
  "AVAX_CCHAIN",
  "LTC",
  "DOGE",
  "SUI",
];

// Vendored icons for popular chains — Rango serves chain logos from
// raw.githubusercontent.com (slow, no CDN). Everything else falls back to
// the remote logo URL.
export const LOCAL_CHAIN_LOGOS: Record<string, string> = {
  BTC: "/assets/chains/BTC.svg",
  ETH: "/assets/chains/ETH.svg",
  SOLANA: "/assets/chains/SOLANA.svg",
  BSC: "/assets/chains/BSC.svg",
  BASE: "/assets/chains/BASE.svg",
  ARBITRUM: "/assets/chains/ARBITRUM.svg",
  TRON: "/assets/chains/TRON.svg",
  OPTIMISM: "/assets/chains/OPTIMISM.svg",
  POLYGON: "/assets/chains/POLYGON.svg",
  TON: "/assets/chains/TON.svg",
  AVAX_CCHAIN: "/assets/chains/AVAX_CCHAIN.svg",
  LTC: "/assets/chains/LTC.svg",
  DOGE: "/assets/chains/DOGE.svg",
  SUI: "/assets/chains/SUI.svg",
  XMR: "/assets/chains/XMR.png",
};

// balanceUsd: chain name -> total wallet balance in USD (0/undefined = no balance)
export function orderChains(
  chains: Blockchain[],
  recent: string[] = [],
  balanceUsd: Record<string, number> = {},
): Blockchain[] {
  const rank = new Map<string, number>();
  recent.forEach((name, i) => {
    if (!rank.has(name)) rank.set(name, i);
  });
  const popBase = recent.length;
  POPULAR_CHAINS.forEach((name, i) => {
    if (!rank.has(name)) rank.set(name, popBase + i);
  });
  const rest = popBase + POPULAR_CHAINS.length;
  const baseOrder = [...chains].sort((a, b) => {
    const ra = rank.get(a.name) ?? rest;
    const rb = rank.get(b.name) ?? rest;
    return ra !== rb ? ra - rb : a.displayName.localeCompare(b.displayName);
  });

  // Balance-aware priority:
  //   1. the most recently used chain, if it has a balance (absolute priority)
  //   2. every other chain with a balance, richest first
  //   3. everything else in the base order (recent -> popular -> alphabetical)
  const hasBalance = (chain: Blockchain) => (balanceUsd[chain.name] ?? 0) > 0;
  const lastUsedWithBalance = recent.length
    ? baseOrder.filter((c) => c.name === recent[0] && hasBalance(c))
    : [];
  const withBalance = baseOrder
    .filter((c) => hasBalance(c) && !lastUsedWithBalance.includes(c))
    .sort((a, b) => (balanceUsd[b.name] ?? 0) - (balanceUsd[a.name] ?? 0));
  const placed = new Set([...lastUsedWithBalance, ...withBalance].map((c) => c.name));
  return [...lastUsedWithBalance, ...withBalance, ...baseOrder.filter((c) => !placed.has(c.name))];
}

// Sum wallet balances per chain (USD). Duck-typed — works with the Rango
// widget's WalletDetail shape without importing its types.
export type WalletBalancesLike =
  | { balances?: { chain: string; amount: string; usdPrice?: number | null }[] | null }[]
  | undefined;

export function getChainBalancesUsd(wallets: WalletBalancesLike): Record<string, number> {
  const totals: Record<string, number> = {};
  (wallets ?? []).forEach((wallet) => {
    wallet.balances?.forEach((balance) => {
      const usd = (parseFloat(balance.amount) || 0) * (balance.usdPrice ?? 0);
      if (usd > 0) totals[balance.chain] = (totals[balance.chain] ?? 0) + usd;
    });
  });
  return totals;
}

export const RECENT_CHAINS_KEY = "dexifier:recentChains";
export const MAX_RECENT_CHAINS = 7;

export function nextRecentChains(recent: string[], name: string): string[] {
  return [name, ...recent.filter((n) => n !== name)].slice(0, MAX_RECENT_CHAINS);
}

export function getRecentChains(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_CHAINS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rememberChain(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_CHAINS_KEY,
      JSON.stringify(nextRecentChains(getRecentChains(), name)),
    );
  } catch {
    /* storage unavailable — recency is best-effort */
  }
}
