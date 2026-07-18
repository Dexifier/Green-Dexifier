import "server-only";
import { joinApiUrl } from "@/lib/url";

// Server-only Exolix client. The API key never reaches the browser bundle —
// all browser calls go through the /api/exolix/* route handlers.

const BASE_URL = process.env.EXOLIX_API_URL ?? "https://exolix.com/api/v2";

function authHeaders(): HeadersInit {
  const key = process.env.EXOLIX_API_KEY;
  if (!key) throw new Error("EXOLIX_API_KEY is not configured");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: key,
  };
}

export async function exolixGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = joinApiUrl(BASE_URL, path, params);
  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ExolixError(res.status, data);
  }
  return data as T;
}

export async function exolixPost<T>(path: string, body: unknown): Promise<T> {
  const url = joinApiUrl(BASE_URL, path);
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ExolixError(res.status, data);
  }
  return data as T;
}

export class ExolixError extends Error {
  constructor(
    public status: number,
    public data: unknown,
  ) {
    super(`Exolix request failed with status ${status}`);
  }
}
