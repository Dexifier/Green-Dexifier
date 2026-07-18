import "server-only";
import { unstable_cache } from "next/cache";
import { exolixGet } from "./exolix";
import { buildFallbackData, type ExolixCurrency } from "../exolix-map";

const PAGE_SIZE = 100;

type CurrenciesPage = { count: number; data: ExolixCurrency[] };

// Fetches every Exolix currency (with nested networks), page by page.
export async function getAllExolixCurrencies(): Promise<ExolixCurrency[]> {
  const first = await exolixGet<CurrenciesPage>("/currencies", {
    page: "1",
    size: String(PAGE_SIZE),
    withNetworks: "true",
  });
  const totalPages = Math.ceil(first.count / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      exolixGet<CurrenciesPage>("/currencies", {
        page: String(i + 2),
        size: String(PAGE_SIZE),
        withNetworks: "true",
      }),
    ),
  );
  return [first, ...rest].flatMap((p) => p.data);
}

// Live-API stand-in for the Postgres cache, shared across serverless
// instances via the Next data cache (revalidated every 6h). Lets the
// currency/network routes keep serving coins (e.g. XMR) while the
// database is unreachable or not yet seeded.
export const getExolixFallback = unstable_cache(
  async () => buildFallbackData(await getAllExolixCurrencies()),
  ["exolix-db-fallback"],
  { revalidate: 21600, tags: ["exolix-cache"] },
);
