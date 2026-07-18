import { describe, expect, it } from "vitest";
import { getPairBySlug, SWAP_PAIRS } from "../lib/pairs";

describe("SWAP_PAIRS (programmatic SEO)", () => {
  it("has unique slugs", () => {
    const slugs = SWAP_PAIRS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("slugs are URL-safe", () => {
    for (const p of SWAP_PAIRS) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every pair has complete token metadata", () => {
    for (const p of SWAP_PAIRS) {
      for (const side of [p.from, p.to]) {
        expect(side.symbol).toBeTruthy();
        expect(side.network).toBeTruthy();
        expect(side.name).toBeTruthy();
        expect(side.chainName).toBeTruthy();
      }
    }
  });

  it("getPairBySlug finds pairs and returns undefined for unknown slugs", () => {
    expect(getPairBySlug("btc-to-eth")?.from.symbol).toBe("BTC");
    expect(getPairBySlug("does-not-exist")).toBeUndefined();
  });
});
