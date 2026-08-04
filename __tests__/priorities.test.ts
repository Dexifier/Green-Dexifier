import { describe, expect, it } from "vitest";
import { getChainBalancesUsd, orderChains } from "../app/utils/chains";
import { orderTokens, tokenKey } from "../app/utils/tokens";
import type { Blockchain } from "../app/types/dexifier";
import type { Token } from "../app/types/dexifier";

const chain = (name: string): Blockchain => ({
  id: name,
  name,
  displayName: name,
  shortName: name,
  logo: null,
});

const CHAINS = ["BTC", "ETH", "SOLANA", "HYPEREVM", "HYPERLIQUID", "SONIC"].map(chain);

describe("orderChains with balances", () => {
  it("puts chains with balance first, richest first", () => {
    const ordered = orderChains(CHAINS, [], { SONIC: 5, HYPEREVM: 500 }).map((c) => c.name);
    expect(ordered.slice(0, 2)).toEqual(["HYPEREVM", "SONIC"]);
  });

  it("gives the last-used chain absolute priority when it has a balance", () => {
    // BTC is recent[0] but poorer than SONIC — BTC still wins
    const ordered = orderChains(CHAINS, ["BTC"], { BTC: 1, SONIC: 9999 }).map((c) => c.name);
    expect(ordered[0]).toBe("BTC");
    expect(ordered[1]).toBe("SONIC");
  });

  it("keeps the base order when nothing has a balance", () => {
    const withBalances = orderChains(CHAINS, ["SONIC"]).map((c) => c.name);
    const without = orderChains(CHAINS, ["SONIC"], {}).map((c) => c.name);
    expect(withBalances).toEqual(without);
  });

  it("does not duplicate or drop chains", () => {
    const ordered = orderChains(CHAINS, ["BTC", "ETH"], { BTC: 3, SOLANA: 2 });
    expect(new Set(ordered.map((c) => c.name)).size).toBe(CHAINS.length);
  });
});

describe("getChainBalancesUsd", () => {
  it("sums amount*usdPrice per chain and skips dust", () => {
    const wallets = [
      {
        balances: [
          { chain: "SOLANA", amount: "2", usdPrice: 100 },
          { chain: "SOLANA", amount: "1", usdPrice: 50 },
          { chain: "BTC", amount: "0", usdPrice: 60000 },
        ],
      },
      { balances: null },
    ];
    expect(getChainBalancesUsd(wallets as any)).toEqual({ SOLANA: 250 });
  });

  it("handles undefined wallets", () => {
    expect(getChainBalancesUsd(undefined)).toEqual({});
  });
});

const token = (
  symbol: string,
  address: string | null = "0x1",
  isPopular = false,
  blockchain = "HYPEREVM",
): Token => ({ symbol, address, isPopular, blockchain });

describe("orderTokens", () => {
  const usdc = token("USDC", "0xusdc", true);
  const hype = token("HYPE", null, true); // native coin
  const meme = token("PURR", "0xpurr");
  const weth = token("WETH", "0xweth");

  it("tokens with balance come first, richest first", () => {
    const ordered = orderTokens(
      [meme, usdc, hype, weth],
      (t) => (t.symbol === "PURR" ? 10 : t.symbol === "WETH" ? 50 : 0),
    );
    expect(ordered.map((t) => t.symbol)).toEqual(["WETH", "PURR", "HYPE", "USDC"]);
  });

  it("recently used tokens with balance get absolute priority", () => {
    const ordered = orderTokens(
      [meme, usdc, hype, weth],
      (t) => (t.symbol === "PURR" ? 1 : t.symbol === "WETH" ? 1000 : 0),
      [tokenKey(meme)],
    );
    expect(ordered[0].symbol).toBe("PURR"); // recent+balance beats richer WETH
    expect(ordered[1].symbol).toBe("WETH");
  });

  it("recent tokens without balance get no priority", () => {
    const ordered = orderTokens([meme, usdc], () => 0, [tokenKey(meme)]);
    expect(ordered[0].symbol).toBe("USDC"); // popular first, meme stays put
  });

  it("native coin leads the popular group", () => {
    const ordered = orderTokens([usdc, hype], () => 0);
    expect(ordered.map((t) => t.symbol)).toEqual(["HYPE", "USDC"]);
  });
});
