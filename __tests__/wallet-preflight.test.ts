import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findMetaMaskProvider,
  preflightWalletUnlock,
  WalletPreflightError,
  withMetaMaskProviderOverride,
  withTimeout,
} from "@/app/utils/wallet-preflight";

// Minimal window stub — each test installs the injected objects it needs.
const win = globalThis as any;

afterEach(() => {
  delete win.window;
  vi.restoreAllMocks();
});

describe("withTimeout", () => {
  it("resolves when the promise settles in time", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000, "x")).resolves.toBe("ok");
  });

  it("rejects with WalletPreflightError on timeout", async () => {
    const never = new Promise(() => {});
    await expect(withTimeout(never, 20, "slow-wallet")).rejects.toBeInstanceOf(
      WalletPreflightError,
    );
  });
});

describe("preflightWalletUnlock", () => {
  it("no-ops for wallets without an injected API (walletconnect, ledger)", async () => {
    win.window = {};
    await expect(preflightWalletUnlock("wallet-connect-2")).resolves.toBeUndefined();
    await expect(preflightWalletUnlock("ledger")).resolves.toBeUndefined();
  });

  it("calls eth_requestAccounts on the MetaMask provider", async () => {
    const request = vi.fn().mockResolvedValue(["0xabc"]);
    win.window = { ethereum: { isMetaMask: true, request } };
    await preflightWalletUnlock("metamask");
    expect(request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
  });

  it("picks MetaMask out of a multi-wallet .providers array", async () => {
    const request = vi.fn().mockResolvedValue(["0xabc"]);
    win.window = {
      ethereum: {
        providers: [
          { isRabby: true, request: vi.fn() },
          { isMetaMask: true, request },
        ],
      },
    };
    await preflightWalletUnlock("metamask");
    expect(request).toHaveBeenCalledOnce();
  });

  it("propagates user rejection instead of hanging", async () => {
    const request = vi.fn().mockRejectedValue(new Error("user rejected"));
    win.window = { ethereum: { isMetaMask: true, request } };
    await expect(preflightWalletUnlock("metamask")).rejects.toThrow("user rejected");
  });

  it("resolves EVM family wallets via their own injection point (okx)", async () => {
    const request = vi.fn().mockResolvedValue(["0x1"]);
    win.window = { okxwallet: { request } };
    await preflightWalletUnlock("okx");
    expect(request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
  });

  it("falls back to the flagged window.ethereum for EVM wallets (rabby)", async () => {
    const request = vi.fn().mockResolvedValue(["0x1"]);
    win.window = { ethereum: { isRabby: true, request } };
    await preflightWalletUnlock("rabby");
    expect(request).toHaveBeenCalledOnce();
  });

  it("calls connect() on Phantom (interactive unlock)", async () => {
    const connect = vi.fn().mockResolvedValue({ publicKey: "pk" });
    win.window = { phantom: { solana: { isPhantom: true, connect } } };
    await preflightWalletUnlock("phantom");
    expect(connect).toHaveBeenCalledOnce();
  });

  it("calls connect() on Solflare", async () => {
    const connect = vi.fn().mockResolvedValue({});
    win.window = { solflare: { isSolflare: true, connect } };
    await preflightWalletUnlock("solflare");
    expect(connect).toHaveBeenCalledOnce();
  });

  it("fires tron_requestAccounts for TronLink and accepts code 200", async () => {
    const request = vi.fn().mockResolvedValue({ code: 200, message: "ok" });
    win.window = { tronLink: { request } };
    await preflightWalletUnlock("tron-link");
    expect(request).toHaveBeenCalledWith({ method: "tron_requestAccounts" });
  });

  it("throws when TronLink resolves with a non-200 code (its rejection quirk)", async () => {
    const request = vi.fn().mockResolvedValue({ code: 4001, message: "user declined" });
    win.window = { tronLink: { request } };
    await expect(preflightWalletUnlock("tron-link")).rejects.toBeInstanceOf(
      WalletPreflightError,
    );
  });

  it("times out instead of hanging forever when nothing answers", async () => {
    const request = vi.fn().mockReturnValue(new Promise(() => {}));
    win.window = { ethereum: { isMetaMask: true, request } };
    vi.useFakeTimers();
    const attempt = preflightWalletUnlock("metamask");
    const assertion = expect(attempt).rejects.toBeInstanceOf(WalletPreflightError);
    await vi.advanceTimersByTimeAsync(61_000);
    await assertion;
    vi.useRealTimers();
  });
});

describe("MetaMask impostor handling", () => {
  it("findMetaMaskProvider skips an isMetaMask-spoofing Phantom in .providers", () => {
    const phantomEvm = { isPhantom: true, isMetaMask: true, request: vi.fn() };
    const realMM = { isMetaMask: true, request: vi.fn() };
    win.window = { ethereum: { ...phantomEvm, providers: [phantomEvm, realMM] } };
    expect(findMetaMaskProvider()).toBe(realMM);
  });

  it("preflight hits the real MetaMask, not the window.ethereum impostor", async () => {
    const phantomRequest = vi.fn().mockResolvedValue(["0xphantom"]);
    const mmRequest = vi.fn().mockResolvedValue(["0xmm"]);
    const phantomEvm = { isPhantom: true, isMetaMask: true, request: phantomRequest };
    const realMM = { isMetaMask: true, request: mmRequest };
    win.window = { ethereum: { ...phantomEvm, providers: [phantomEvm, realMM] } };
    await preflightWalletUnlock("metamask");
    expect(mmRequest).toHaveBeenCalledOnce();
    expect(phantomRequest).not.toHaveBeenCalled();
  });

  it("findMetaMaskProvider returns null when only an impostor is present", () => {
    win.window = { ethereum: { isPhantom: true, isMetaMask: true } };
    expect(findMetaMaskProvider()).toBeNull();
  });

  it("withMetaMaskProviderOverride swaps window.ethereum during connect and restores after", async () => {
    const phantomEvm = { isPhantom: true, isMetaMask: true };
    const realMM = { isMetaMask: true };
    win.window = { ethereum: { ...phantomEvm, providers: [phantomEvm, realMM] } };
    const seenDuring: any[] = [];
    await withMetaMaskProviderOverride(async () => {
      seenDuring.push((win.window as any).ethereum);
    });
    expect(seenDuring[0]).toBe(realMM);
    expect((win.window as any).ethereum).not.toBe(realMM); // restored
    expect((win.window as any).ethereum.isPhantom).toBe(true);
  });

  it("withMetaMaskProviderOverride is a no-op when MetaMask already owns window.ethereum", async () => {
    const realMM = { isMetaMask: true };
    win.window = { ethereum: realMM };
    const seenDuring: any[] = [];
    await withMetaMaskProviderOverride(async () => {
      seenDuring.push((win.window as any).ethereum);
    });
    expect(seenDuring[0]).toBe(realMM);
    expect((win.window as any).ethereum).toBe(realMM);
  });
});
