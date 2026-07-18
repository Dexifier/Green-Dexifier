// Canonical-token dedupe for the merged Rango + Exolix coin list.
// Rango meta ships many same-symbol tokens per chain (bridged variants,
// lookalike scams); searching "USDC" on Solana returned a dozen rows.
// Keep exactly one entry per (symbol, chain): the canonical one.
import type { Token as RangoToken } from "rango-types/mainApi";
import type { Token } from "@/app/types/dexifier";
import { MAP_BLOCKCHAIN_RANGO_2_EXOLIX } from "./exolix";

// Exolix network code -> Rango chain name, so an Exolix coin
// ("USDT" on "TRX") groups with its Rango counterpart ("USDT" on "TRON").
const EXOLIX_2_RANGO: Record<string, string> = Object.fromEntries(
  Object.entries(MAP_BLOCKCHAIN_RANGO_2_EXOLIX).map(([rango, exolix]) => [exolix, rango]),
);
// Aliases not covered by the map above.
const CHAIN_ALIASES: Record<string, string> = {
  AVAXC: "AVAX_CCHAIN",
};

export function normalizeChainName(chain: string): string {
  return EXOLIX_2_RANGO[chain] ?? CHAIN_ALIASES[chain] ?? chain;
}

type Ranked = {
  isPopular?: boolean;
  isSecondaryCoin?: boolean;
  supportedSwappers?: string[] | null;
  usdPrice?: number | null;
};

// Lexicographic rank within a (symbol, chain) group; higher tuple wins:
// popular > not-flagged-risky > more swapper support > has price > price.
function rank(t: Ranked): readonly [number, number, number, number, number] {
  return [
    t.isPopular ? 1 : 0,
    t.isSecondaryCoin ? 0 : 1,
    t.supportedSwappers?.length ?? 0,
    t.usdPrice ? 1 : 0,
    t.usdPrice ?? 0,
  ];
}

function outranks(a: Ranked, b: Ranked): boolean {
  const ra = rank(a);
  const rb = rank(b);
  for (let i = 0; i < ra.length; i++) {
    if (ra[i] !== rb[i]) return ra[i] > rb[i];
  }
  return false;
}

export type ExolixCoinInput = {
  symbol: string;
  blockchain?: string;
  image?: string | null;
};

type GroupedToken = Token & { supportedSwappers?: string[] | null; isSecondaryCoin?: boolean };

export function dedupeTokens(rangoTokens: RangoToken[], exolixCoins: ExolixCoinInput[]): Token[] {
  const byGroup = new Map<string, GroupedToken>();
  for (const t of rangoTokens) {
    if (!t.symbol || !t.blockchain) continue;
    const key = `${t.symbol.toUpperCase()}|${normalizeChainName(t.blockchain)}`;
    const prev = byGroup.get(key);
    if (!prev || outranks(t, prev)) {
      byGroup.set(key, {
        address: t.address,
        isPopular: t.isPopular,
        symbol: t.symbol,
        blockchain: t.blockchain,
        image: t.image,
        decimals: t.decimals,
        usdPrice: t.usdPrice,
        supportedSwappers: t.supportedSwappers,
        isSecondaryCoin: t.isSecondaryCoin,
      });
    }
  }
  for (const c of exolixCoins) {
    if (!c.symbol || !c.blockchain) continue;
    const key = `${c.symbol.toUpperCase()}|${normalizeChainName(c.blockchain)}`;
    // A Rango entry wins the slot; Exolix routes still quote by symbol+network,
    // so nothing is lost by dropping the duplicate Exolix-only row.
    if (byGroup.has(key)) continue;
    byGroup.set(key, {
      address: null,
      symbol: c.symbol,
      blockchain: c.blockchain,
      image: c.image ?? undefined,
    });
  }
  return [...byGroup.values()].map((t) => {
    const token = { ...t };
    delete token.supportedSwappers;
    delete token.isSecondaryCoin;
    return token;
  });
}
