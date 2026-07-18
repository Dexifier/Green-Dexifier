import "server-only";

// Server-only client for the Dexifier Chainflip broker. The broker API key
// stays on the server; browsers call the /api/chainflip/* route handlers.

const BASE_URL = process.env.CHAINFLIP_BROKER_URL ?? "https://chainflip-broker.io";

export async function chainflipGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const apiKey = process.env.CHAINFLIP_API_KEY;
  if (!apiKey) throw new Error("CHAINFLIP_API_KEY is not configured");

  const url = new URL(path, BASE_URL);
  url.searchParams.set("apiKey", apiKey);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url, { headers: { Accept: "*/*" }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ChainflipBrokerError(res.status, data);
  }
  return data as T;
}

export class ChainflipBrokerError extends Error {
  constructor(
    public status: number,
    public data: unknown,
  ) {
    super(`Chainflip broker request failed with status ${status}`);
  }
}
