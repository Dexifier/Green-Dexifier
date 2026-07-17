// Browser-safe API client.
//
// Exolix and Chainflip calls go through our own /api/* route handlers, which
// hold the provider keys on the server. Only Rango is called directly from
// the browser, because Rango's widget and public API are designed around
// public per-dApp API keys (the same key is embedded in the widget config).

import type {
  ConfirmRouteRequest,
  ConfirmRouteResponse,
  MultiRouteRequest,
  MultiRouteResponse,
} from "rango-types/mainApi";
import type {
  ChainflipQuote,
  ChainflipSwapRequest,
  ChainflipSwapResponse,
  ChainflipSwapStatus,
} from "@/app/types/chainflip";
import type { ExTxInfo, RateRequest, RateResponse, TxRequest } from "@/app/types/exolix";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof data?.detail === "string" && data.detail) ||
      (typeof data?.error === "string" && data.error) ||
      `Request failed with status ${res.status}`;
    const err = new Error(message) as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof data?.error === "string" && data.error) ||
      `Request failed with status ${res.status}`;
    const err = new Error(message) as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

// ---------------------------------------------------------------- Exolix ---

export function getExolixRate(request: RateRequest): Promise<RateResponse> {
  const qs = new URLSearchParams(
    Object.entries(request).map(([k, v]) => [k, String(v)]),
  );
  return getJson<RateResponse>(`/api/exolix/rate?${qs}`);
}

export function createExolixTransaction(request: TxRequest): Promise<ExTxInfo> {
  return postJson<ExTxInfo>("/api/exolix/transactions", request);
}

export function getExolixTxInfo(txId: string): Promise<ExTxInfo> {
  return getJson<ExTxInfo>(`/api/exolix/transactions/${encodeURIComponent(txId)}`);
}

// ------------------------------------------------------------- Chainflip ---

export function getChainflipQuotes(params: {
  sourceAsset: string;
  destinationAsset: string;
  amount: string;
  commissionBps?: number;
}): Promise<ChainflipQuote[]> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  return getJson<ChainflipQuote[]>(`/api/chainflip/quotes?${qs}`);
}

export function createChainflipSwap(
  params: ChainflipSwapRequest,
): Promise<ChainflipSwapResponse> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );
  return getJson<ChainflipSwapResponse>(`/api/chainflip/swap?${qs}`);
}

export async function getChainflipSwapStatus(
  swapId: number,
): Promise<ChainflipSwapStatus> {
  const data = await getJson<{ status: ChainflipSwapStatus }>(
    `/api/chainflip/status?swapId=${swapId}`,
  );
  return data.status;
}

// ----------------------------------------------------------------- Rango ---
// Rango's API key is public by design (it identifies the dApp, not a user),
// so the multi-route call can be made directly from the browser.

const RANGO_API_URL =
  process.env.NEXT_PUBLIC_RANGO_API_URL ?? "https://api.rango.exchange";

function rangoApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_RANGO_API_KEY_BASIC ??
    process.env.NEXT_PUBLIC_RANGO_API_KEY ??
    ""
  );
}

export async function getRangoRoutes(
  request: MultiRouteRequest,
): Promise<MultiRouteResponse> {
  const res = await fetch(
    `${RANGO_API_URL}/routing/bests?apiKey=${rangoApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok) {
    throw new Error(`Rango routing request failed with status ${res.status}`);
  }
  return (await res.json()) as MultiRouteResponse;
}

export async function confirmRangoRoute(
  request: ConfirmRouteRequest,
): Promise<ConfirmRouteResponse> {
  const res = await fetch(
    `${RANGO_API_URL}/routing/confirm?apiKey=${rangoApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok) {
    throw new Error(`Rango confirm request failed with status ${res.status}`);
  }
  return (await res.json()) as ConfirmRouteResponse;
}
