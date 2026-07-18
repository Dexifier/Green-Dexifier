import { describe, expect, it } from "vitest";
import type { Blockchain } from "../app/types/dexifier";
import { MAX_RECENT_CHAINS, nextRecentChains, orderChains, POPULAR_CHAINS } from "../app/utils/chains";

const mkChain = (name: string): Blockchain => ({
  id: name,
  name,
  displayName: name.charAt(0) + name.slice(1).toLowerCase(),
  shortName: name,
  logo: null,
});

const ALL = ["MEGAETH", "SONIC", "BTC", "ETH", "SOLANA", "XMR", "BSC", "BASE", "ZZZ"].map(mkChain);

describe("orderChains", () => {
  it("orders by the curated popularity list when no history exists", () => {
    const ordered = orderChains(ALL).map((c) => c.name);
    expect(ordered.slice(0, 6)).toEqual(["BTC", "ETH", "SOLANA", "XMR", "BSC", "BASE"]);
  });

  it("puts recently used chains first, in recency order", () => {
    const ordered = orderChains(ALL, ["SONIC", "BASE"]).map((c) => c.name);
    expect(ordered.slice(0, 2)).toEqual(["SONIC", "BASE"]);
    // curated list follows, excluding the already-shown recent ones
    expect(ordered.slice(2, 6)).toEqual(["BTC", "ETH", "SOLANA", "XMR"]);
  });

  it("ignores recent names that don't exist in the chain list", () => {
    const ordered = orderChains(ALL, ["GONE", "BTC"]).map((c) => c.name);
    expect(ordered[0]).toBe("BTC");
  });

  it("appends unknown chains alphabetically after the curated list", () => {
    const ordered = orderChains(ALL).map((c) => c.name);
    const tail = ordered.slice(-3);
    expect(tail).toEqual(["MEGAETH", "SONIC", "ZZZ"]);
  });

  it("is stable: same inputs, same output", () => {
    expect(orderChains(ALL, ["ETH"])).toEqual(orderChains(ALL, ["ETH"]));
  });

  it("curated list has no duplicates", () => {
    expect(new Set(POPULAR_CHAINS).size).toBe(POPULAR_CHAINS.length);
  });
});

describe("nextRecentChains", () => {
  it("prepends and dedupes", () => {
    expect(nextRecentChains(["BTC", "ETH"], "ETH")).toEqual(["ETH", "BTC"]);
    expect(nextRecentChains([], "XMR")).toEqual(["XMR"]);
  });

  it("caps the list at MAX_RECENT_CHAINS", () => {
    const full = Array.from({ length: MAX_RECENT_CHAINS + 3 }, (_, i) => `C${i}`);
    const next = nextRecentChains(full, "NEW");
    expect(next).toHaveLength(MAX_RECENT_CHAINS);
    expect(next[0]).toBe("NEW");
  });
});
