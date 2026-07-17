import { describe, expect, it } from "vitest";
import {
  EXOLIX_BLOCKCHAIN_NAME_MAP,
  getExolixflipBlockchainName,
  MAP_BLOCKCHAIN_RANGO_2_EXOLIX,
} from "../app/utils/exolix";
import { CHAINFLIP_BLOCKCHAIN_NAME_MAP } from "../app/utils/chainflip";

describe("getExolixflipBlockchainName", () => {
  it("maps known Rango blockchain names to Exolix network names", () => {
    expect(getExolixflipBlockchainName("BTC")).toBe("BTC");
    expect(getExolixflipBlockchainName("Tron")).toBe("TRX");
    expect(getExolixflipBlockchainName("TRON")).toBe("TRX");
    expect(getExolixflipBlockchainName("Solana")).toBe("SOL");
    expect(getExolixflipBlockchainName("BSC")).toBe("BSC");
  });

  it("returns undefined for unknown chains", () => {
    expect(getExolixflipBlockchainName("FANTOM")).toBeUndefined();
    expect(getExolixflipBlockchainName("not-a-chain")).toBeUndefined();
  });

  it("every map value is a non-empty string", () => {
    for (const value of Object.values(EXOLIX_BLOCKCHAIN_NAME_MAP)) {
      expect(value.length).toBeGreaterThan(0);
    }
    for (const value of Object.values(MAP_BLOCKCHAIN_RANGO_2_EXOLIX)) {
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe("CHAINFLIP_BLOCKCHAIN_NAME_MAP", () => {
  it("is bidirectional between Rango and Chainflip names", () => {
    expect(CHAINFLIP_BLOCKCHAIN_NAME_MAP["ETH"]).toBe("eth");
    expect(CHAINFLIP_BLOCKCHAIN_NAME_MAP["eth"]).toBe("ETH");
    expect(CHAINFLIP_BLOCKCHAIN_NAME_MAP["BTC"]).toBe("btc");
    expect(CHAINFLIP_BLOCKCHAIN_NAME_MAP["btc"]).toBe("BTC");
    expect(CHAINFLIP_BLOCKCHAIN_NAME_MAP["SOLANA"]).toBe("sol");
    expect(CHAINFLIP_BLOCKCHAIN_NAME_MAP["sol"]).toBe("SOLANA");
  });
});
