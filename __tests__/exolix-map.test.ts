import { describe, expect, it } from "vitest";
import {
  buildFallbackData,
  dedupeNetworkRows,
  toCurrencyRows,
  toNetworkRow,
  type ExolixCurrency,
} from "../lib/exolix-map";

const xmr: ExolixCurrency = {
  code: "XMR",
  name: "Monero",
  icon: "https://exolix.com/icons/xmr.png",
  networks: [
    {
      network: "XMR",
      name: "Monero",
      shortName: "XMR",
      isDefault: true,
      memoNeeded: false,
      precision: 12,
      icon: "https://exolix.com/icons/xmr.png",
      // Extra keys the Exolix API sends but the schema doesn't have:
      platformTypes: ["MAIN"],
      priority: 1,
      privacy: true,
    },
  ],
};

const usdt: ExolixCurrency = {
  code: "USDT",
  name: "Tether",
  networks: [
    { network: "TRX", name: "Tron", precision: 6, contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
    { network: "ETH", name: "Ethereum", precision: 6, contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
  ],
};

describe("toNetworkRow", () => {
  it("keeps only schema fields and defaults missing ones", () => {
    const row = toNetworkRow(xmr.networks![0]);
    expect(row).toEqual({
      network: "XMR",
      name: "Monero",
      shortName: "XMR",
      addressRegex: null,
      notes: null,
      isDefault: true,
      decimal: null,
      icon: "https://exolix.com/icons/xmr.png",
      blockExplorer: null,
      depositMinAmount: null,
      memoNeeded: false,
      memoName: null,
      memoRegex: null,
      precision: 12,
      contract: null,
    });
    expect(row).not.toHaveProperty("platformTypes");
    expect(row).not.toHaveProperty("privacy");
  });

  it("defaults precision to 0 when absent", () => {
    expect(toNetworkRow({ network: "BTC", name: "Bitcoin" }).precision).toBe(0);
  });
});

describe("dedupeNetworkRows", () => {
  it("dedupes networks by code, first occurrence wins", () => {
    const rows = dedupeNetworkRows([
      usdt,
      { code: "USDC", name: "USD Coin", networks: [{ network: "ETH", name: "Ethereum (changed)" }] },
    ]);
    expect(rows.map((r) => r.network).sort()).toEqual(["ETH", "TRX"]);
    expect(rows.find((r) => r.network === "ETH")?.name).toBe("Ethereum");
  });

  it("tolerates currencies without networks", () => {
    expect(dedupeNetworkRows([{ code: "ABC", name: "No Nets" }])).toEqual([]);
  });
});

describe("toCurrencyRows", () => {
  it("emits one row per currency-network pair and drops unknown networks", () => {
    const idByNetwork = new Map([["TRX", 7]]);
    const rows = toCurrencyRows([usdt], idByNetwork);
    expect(rows).toEqual([
      { code: "USDT", name: "Tether", icon: null, notes: null, networkId: 7 },
    ]);
  });
});

describe("buildFallbackData", () => {
  it("produces joinable networks and currencies with synthetic ids", () => {
    const { networks, currencies } = buildFallbackData([xmr, usdt]);
    // Networks sorted by code for stable ids
    expect(networks.map((n) => n.network)).toEqual(["ETH", "TRX", "XMR"]);
    // Every currency row points at an existing network id
    const ids = new Set(networks.map((n) => n.id));
    for (const c of currencies) expect(ids.has(c.networkId)).toBe(true);
    // XMR resolves to the Monero network (this is what the frontend join does)
    const xmrRow = currencies.find((c) => c.code === "XMR");
    expect(xmrRow).toBeDefined();
    expect(networks.find((n) => n.id === xmrRow!.networkId)?.network).toBe("XMR");
    // USDT yields one row per network
    expect(currencies.filter((c) => c.code === "USDT")).toHaveLength(2);
  });

  it("is deterministic for the same input", () => {
    const a = buildFallbackData([usdt, xmr]);
    const b = buildFallbackData([usdt, xmr]);
    expect(a).toEqual(b);
  });
});
