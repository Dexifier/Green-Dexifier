import { describe, expect, it } from "vitest";
import type { Token as RangoToken } from "rango-types/mainApi";
import { dedupeTokens, normalizeChainName } from "../app/utils/tokens";

const mkToken = (partial: Partial<RangoToken> & { symbol: string; blockchain: string }): RangoToken =>
  ({
    address: null,
    name: partial.symbol,
    decimals: 18,
    image: "",
    isPopular: false,
    isSecondaryCoin: false,
    usdPrice: null,
    supportedSwappers: [],
    ...partial,
  }) as RangoToken;

const OFFICIAL_USDC_SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("normalizeChainName", () => {
  it("maps Exolix network codes to Rango chain names", () => {
    expect(normalizeChainName("SOL")).toBe("SOLANA");
    expect(normalizeChainName("TRX")).toBe("TRON");
    expect(normalizeChainName("MATIC")).toBe("POLYGON");
    expect(normalizeChainName("AVAXC")).toBe("AVAX_CCHAIN");
  });

  it("passes through unknown or already-normal names", () => {
    expect(normalizeChainName("BTC")).toBe("BTC");
    expect(normalizeChainName("XMR")).toBe("XMR");
    expect(normalizeChainName("SOLANA")).toBe("SOLANA");
  });
});

describe("dedupeTokens", () => {
  it("keeps only the popular token out of many same-symbol clones", () => {
    const clones = [
      mkToken({ symbol: "USDC", blockchain: "SOLANA", address: OFFICIAL_USDC_SOL, isPopular: true, usdPrice: 1, supportedSwappers: ["a", "b"] }),
      mkToken({ symbol: "USDC", blockchain: "SOLANA", address: "A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM" }),
      mkToken({ symbol: "USDC", blockchain: "SOLANA", address: "FCqfQSujuPxy6V42UvafBhsysWtEq1vhjfMN1PUbgaxA" }),
      mkToken({ symbol: "USDC", blockchain: "SOLANA", address: "E2VmbootbVCBkMNNxKQgCLMS1X3NoGMaYAsufaAsf7M" }),
    ];
    const out = dedupeTokens(clones, []);
    expect(out).toHaveLength(1);
    expect(out[0].address).toBe(OFFICIAL_USDC_SOL);
  });

  it("keeps one token per (symbol, chain) — same symbol on other chains survives", () => {
    const out = dedupeTokens(
      [
        mkToken({ symbol: "USDC", blockchain: "SOLANA", address: OFFICIAL_USDC_SOL, isPopular: true }),
        mkToken({ symbol: "USDC", blockchain: "ETH", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", isPopular: true }),
        mkToken({ symbol: "USDC", blockchain: "ETH", address: "0xclone" }),
      ],
      [],
    );
    expect(out).toHaveLength(2);
    expect(out.map((t) => t.blockchain).sort()).toEqual(["ETH", "SOLANA"]);
  });

  it("prefers the best-supported token when none is popular", () => {
    const out = dedupeTokens(
      [
        mkToken({ symbol: "LINK", blockchain: "BSC", address: "0xwrapped", supportedSwappers: ["one"] }),
        mkToken({ symbol: "LINK", blockchain: "BSC", address: "0xcanonical", supportedSwappers: ["a", "b", "c"], usdPrice: 8.25 }),
      ],
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0].address).toBe("0xcanonical");
  });

  it("keeps Exolix-only coins (XMR) that Rango doesn't list", () => {
    const out = dedupeTokens([], [{ symbol: "XMR", blockchain: "XMR", image: "xmr.png" }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ symbol: "XMR", blockchain: "XMR", address: null });
  });

  it("drops the Exolix duplicate when Rango lists the same coin on the aliased chain", () => {
    const out = dedupeTokens(
      [mkToken({ symbol: "USDT", blockchain: "TRON", address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", isPopular: true })],
      [{ symbol: "USDT", blockchain: "TRX", image: "usdt.png" }],
    );
    expect(out).toHaveLength(1);
    expect(out[0].blockchain).toBe("TRON");
  });

  it("matches groups case-insensitively on the symbol", () => {
    const out = dedupeTokens(
      [mkToken({ symbol: "USDC", blockchain: "SOLANA", address: OFFICIAL_USDC_SOL, isPopular: true })],
      [{ symbol: "usdc", blockchain: "SOL" }],
    );
    expect(out).toHaveLength(1);
  });

  it("keeps Exolix coins whose network has no Rango counterpart even if symbol matches", () => {
    // Exolix-only chain: no Rango token can exist for it, coin must survive.
    const out = dedupeTokens(
      [mkToken({ symbol: "SOME", blockchain: "ETH", address: "0x1" })],
      [{ symbol: "SOME", blockchain: "SOMECHAIN", image: null }],
    );
    expect(out).toHaveLength(2);
  });
});
