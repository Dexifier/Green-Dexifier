import type { MultiRouteRequest, MultiRouteSimulationResult } from "rango-types/mainApi";
import type { ChainflipQuote } from "../types/chainflip";
import type { DNetwork, RateResponse } from "../types/exolix";
import type { Token } from "../types/dexifier";
import { CHAINFLIP_BLOCKCHAIN_NAME_MAP } from "./chainflip";
import { resolveExolixNetwork } from "./exolix";
import { getChainflipQuotes, getExolixRate, getRangoRoutes } from "@/lib/api-client";

export type DexifierRoute = MultiRouteSimulationResult | ChainflipQuote | RateResponse;

// One slow or hung provider must never hold back the others' quotes.
export const PROVIDER_TIMEOUT_MS = 20_000;

const withProviderTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} quote timed out`)), ms),
    ),
  ]);

export interface FetchRoutesParams {
  tokenFrom: Token;
  tokenTo: Token;
  amount: string;
  networks: DNetwork[];
  includeRango: boolean; // false on mobile — browser wallets don't work there
  slippage: string;
  swapperGroups: MultiRouteRequest["swapperGroups"];
  timeoutMs?: number; // tests inject a tiny value
}

// Query Chainflip, Exolix and (optionally) Rango concurrently. Results come
// back in a fixed slot order (chainflip → exolix → rango) regardless of which
// provider answered first; a failed or timed-out provider contributes nothing.
export async function fetchAllRoutes({
  tokenFrom,
  tokenTo,
  amount,
  networks,
  includeRango,
  slippage,
  swapperGroups,
  timeoutMs = PROVIDER_TIMEOUT_MS,
}: FetchRoutesParams): Promise<DexifierRoute[]> {
  if (!tokenFrom.blockchain || !tokenTo.blockchain) return [];

  const chainflipQuotes: Promise<ChainflipQuote[]> =
    tokenFrom.blockchain in CHAINFLIP_BLOCKCHAIN_NAME_MAP &&
    tokenTo.blockchain in CHAINFLIP_BLOCKCHAIN_NAME_MAP
      ? withProviderTimeout(
          getChainflipQuotes({
            sourceAsset: `${tokenFrom.symbol.toLowerCase()}.${CHAINFLIP_BLOCKCHAIN_NAME_MAP[tokenFrom.blockchain]}`,
            destinationAsset: `${tokenTo.symbol.toLowerCase()}.${CHAINFLIP_BLOCKCHAIN_NAME_MAP[tokenTo.blockchain]}`,
            amount: amount,
            commissionBps: 15,
          }),
          timeoutMs,
          "Chainflip",
        )
      : Promise.resolve([]);

  const exolixRate: Promise<RateResponse[]> = withProviderTimeout(
    getExolixRate({
      coinFrom: tokenFrom.symbol,
      networkFrom: resolveExolixNetwork(tokenFrom.blockchain, networks),
      coinTo: tokenTo.symbol,
      networkTo: resolveExolixNetwork(tokenTo.blockchain, networks),
      amount: amount,
      rateType: "float",
    }).then((rate) => [rate]),
    timeoutMs,
    "Exolix",
  );

  const rangoRoutes: Promise<MultiRouteSimulationResult[]> = !includeRango
    ? Promise.resolve([])
    : withProviderTimeout(
        getRangoRoutes({
          amount: amount,
          from: {
            address: tokenFrom.address,
            blockchain: tokenFrom.blockchain,
            symbol: tokenFrom.symbol,
          },
          to: {
            address: tokenTo.address,
            blockchain: tokenTo.blockchain,
            symbol: tokenTo.symbol,
          },
          slippage: slippage,
          swapperGroups: swapperGroups,
          swappersGroupsExclude: false,
        }).then((response) =>
          response.results.sort((a, b) => a.swaps.length - b.swaps.length),
        ),
        timeoutMs,
        "Rango",
      );

  const [chainflip, exolix, rango] = await Promise.allSettled([
    chainflipQuotes,
    exolixRate,
    rangoRoutes,
  ]);

  const allRoutes: DexifierRoute[] = [];
  if (chainflip.status === "fulfilled") allRoutes.push(...chainflip.value);
  if (exolix.status === "fulfilled") allRoutes.push(...exolix.value);
  if (rango.status === "fulfilled") allRoutes.push(...rango.value);
  return allRoutes;
}
