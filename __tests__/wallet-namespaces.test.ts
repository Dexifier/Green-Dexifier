import { describe, expect, it } from "vitest";
import { connectNamespacesFor } from "@/app/utils/wallet-namespaces";

describe("connectNamespacesFor", () => {
  it("restricts MetaMask to EVM when it also advertises Solana", () => {
    expect(connectNamespacesFor("metamask", ["EVM", "Solana"])).toEqual(["EVM"]);
  });

  it("keeps a MetaMask namespace list that is already EVM-only", () => {
    expect(connectNamespacesFor("metamask", ["EVM"])).toEqual(["EVM"]);
  });

  it("falls back to the advertised list if filtering would leave nothing", () => {
    // A future MetaMask that stops advertising EVM should still connect
    // something rather than silently doing nothing.
    expect(connectNamespacesFor("metamask", ["Solana"])).toEqual(["Solana"]);
  });

  it("leaves other wallets' namespaces untouched", () => {
    expect(connectNamespacesFor("phantom", ["Solana", "EVM"])).toEqual([
      "Solana",
      "EVM",
    ]);
    expect(connectNamespacesFor("tron-link", ["Tron"])).toEqual(["Tron"]);
  });

  it("handles an empty namespace list", () => {
    expect(connectNamespacesFor("metamask", [])).toEqual([]);
  });
});
