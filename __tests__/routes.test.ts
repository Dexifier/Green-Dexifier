import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({
  getChainflipQuotes: vi.fn(),
  getExolixRate: vi.fn(),
  getRangoRoutes: vi.fn(),
}));

import { fetchAllRoutes } from "../app/utils/routes";
import {
  getChainflipQuotes,
  getExolixRate,
  getRangoRoutes,
} from "@/lib/api-client";
import type { Token } from "../app/types/dexifier";

const cfMock = vi.mocked(getChainflipQuotes);
const exMock = vi.mocked(getExolixRate);
const rangoMock = vi.mocked(getRangoRoutes);

const token = (symbol: string, blockchain?: string): Token => ({
  address: null,
  symbol,
  blockchain,
});

const baseParams = {
  networks: [],
  slippage: "1",
  swapperGroups: [],
  timeoutMs: 1000,
};

const cfQuote = { egressAmount: 2, ingressAsset: "btc.btc", egressAsset: "eth.eth" };
const exRate = { toAmount: 3 };
const rangoResult = (steps: number) => ({
  swaps: Array.from({ length: steps }, (_, i) => ({ swapperId: `s${i}` })),
  outputAmount: "1",
});

beforeEach(() => {
  vi.clearAllMocks();
  cfMock.mockResolvedValue([cfQuote] as never);
  exMock.mockResolvedValue(exRate as never);
  rangoMock.mockResolvedValue({ results: [rangoResult(2), rangoResult(1)] } as never);
});

describe("fetchAllRoutes", () => {
  it("combines all providers in fixed slot order, even when a later slot answers first", async () => {
    // Chainflip resolves last; slot order must still be chainflip → exolix → rango.
    cfMock.mockImplementation(
      () => new Promise((res) => setTimeout(() => res([cfQuote]), 40)) as never,
    );
    const routes = await fetchAllRoutes({
      ...baseParams,
      tokenFrom: token("BTC", "BTC"),
      tokenTo: token("ETH", "ETH"),
      amount: "1",
      includeRango: true,
    });
    expect(routes).toHaveLength(4); // 1 chainflip + 1 exolix + 2 rango
    expect("egressAmount" in routes[0]).toBe(true); // chainflip first
    expect("toAmount" in routes[1]).toBe(true); // exolix second
    expect("outputAmount" in routes[2]).toBe(true); // rango last
    expect("outputAmount" in routes[3]).toBe(true);
  });

  it("sorts rango results by fewest steps", async () => {
    const routes = await fetchAllRoutes({
      ...baseParams,
      tokenFrom: token("BTC", "BTC"),
      tokenTo: token("ETH", "ETH"),
      amount: "1",
      includeRango: true,
    });
    const rango = routes.filter((r) => "outputAmount" in r) as {
      swaps: unknown[];
    }[];
    expect(rango[0].swaps).toHaveLength(1);
    expect(rango[1].swaps).toHaveLength(2);
  });

  it("survives a chainflip failure", async () => {
    cfMock.mockRejectedValue(new Error("broker 504") as never);
    const routes = await fetchAllRoutes({
      ...baseParams,
      tokenFrom: token("BTC", "BTC"),
      tokenTo: token("ETH", "ETH"),
      amount: "1",
      includeRango: true,
    });
    expect(routes).toHaveLength(3); // 1 exolix + 2 rango
    expect(routes.some((r) => "toAmount" in r)).toBe(true);
    expect(routes.some((r) => "outputAmount" in r)).toBe(true);
  });

  it("survives an exolix failure", async () => {
    exMock.mockRejectedValue(new Error("pair not available") as never);
    const routes = await fetchAllRoutes({
      ...baseParams,
      tokenFrom: token("BTC", "BTC"),
      tokenTo: token("ETH", "ETH"),
      amount: "1",
      includeRango: true,
    });
    expect(routes).toHaveLength(3); // 1 chainflip + 2 rango
    expect(routes.some((r) => "egressAmount" in r)).toBe(true);
    expect(routes.some((r) => "outputAmount" in r)).toBe(true);
  });

  it("never calls rango when includeRango is false (mobile)", async () => {
    const routes = await fetchAllRoutes({
      ...baseParams,
      tokenFrom: token("BTC", "BTC"),
      tokenTo: token("ETH", "ETH"),
      amount: "1",
      includeRango: false,
    });
    expect(rangoMock).not.toHaveBeenCalled();
    expect(routes).toHaveLength(2);
  });

  it("skips chainflip when a chain is not in its map", async () => {
    const routes = await fetchAllRoutes({
      ...baseParams,
      tokenFrom: token("XMR", "XMR"),
      tokenTo: token("ETH", "ETH"),
      amount: "1",
      includeRango: false,
    });
    expect(cfMock).not.toHaveBeenCalled();
    expect(routes).toHaveLength(1);
  });

  it("a hung provider times out and the rest still arrive", async () => {
    cfMock.mockImplementation(() => new Promise(() => {}) as never); // never resolves
    const routes = await fetchAllRoutes({
      ...baseParams,
      tokenFrom: token("BTC", "BTC"),
      tokenTo: token("ETH", "ETH"),
      amount: "1",
      includeRango: true,
      timeoutMs: 30,
    });
    expect(routes).toHaveLength(3); // exolix + 2 rango, no chainflip
    expect(routes.some((r) => "egressAmount" in r)).toBe(false);
  });

  it("returns nothing and calls nobody when a chain is missing", async () => {
    const routes = await fetchAllRoutes({
      ...baseParams,
      tokenFrom: token("BTC"),
      tokenTo: token("ETH", "ETH"),
      amount: "1",
      includeRango: true,
    });
    expect(routes).toEqual([]);
    expect(cfMock).not.toHaveBeenCalled();
    expect(exMock).not.toHaveBeenCalled();
    expect(rangoMock).not.toHaveBeenCalled();
  });
});
