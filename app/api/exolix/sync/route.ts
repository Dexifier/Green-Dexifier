import { prisma } from "@/lib/prisma";
import { exolixGet } from "@/lib/server/exolix";
import { NextRequest, NextResponse } from "next/server";

// Re-syncs the Exolix networks/currencies cache in Postgres.
// Runs daily via Vercel Cron and can be triggered manually with:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/exolix/sync

export const maxDuration = 60;

type ExolixNetwork = {
  coinNetworkId?: string;
  network: string;
  name: string;
  shortName?: string | null;
  addressRegex?: string | null;
  notes?: string | null;
  isDefault?: boolean;
  decimal?: number | null;
  icon?: string | null;
  blockExplorer?: string | null;
  depositMinAmount?: number | null;
  memoNeeded?: boolean;
};

type ExolixCurrency = {
  code: string;
  name: string;
  icon?: string | null;
  notes?: string | null;
  networks: ExolixNetwork[];
};

type CurrenciesPage = { count: number; data: ExolixCurrency[] };

const PAGE_SIZE = 100;

async function getAllCurrencies(): Promise<ExolixCurrency[]> {
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

async function handler(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currencies = await getAllCurrencies();

    // Networks: dedupe by Exolix network code, insert missing ones.
    // Whitelist only the schema fields — Exolix sends extra keys
    // (contract, precision, platformTypes, ...) that Prisma would reject.
    const networkByCode = new Map<string, Record<string, unknown>>();
    for (const currency of currencies) {
      for (const n of currency.networks) {
        if (networkByCode.has(n.network)) continue;
        networkByCode.set(n.network, {
          network: n.network,
          name: n.name,
          shortName: n.shortName ?? null,
          addressRegex: n.addressRegex ?? null,
          notes: n.notes ?? null,
          isDefault: n.isDefault ?? false,
          decimal: n.decimal ?? null,
          icon: n.icon ?? null,
          blockExplorer: n.blockExplorer ?? null,
          depositMinAmount: n.depositMinAmount ?? null,
          memoNeeded: n.memoNeeded ?? false,
        });
      }
    }
    await prisma.network.createMany({
      data: [...networkByCode.values()] as never,
      skipDuplicates: true,
    });

    const idByNetwork = new Map(
      (await prisma.network.findMany()).map((n) => [n.network, n.id]),
    );

    // Currencies: full refresh (one row per currency-network pair).
    const rows = currencies.flatMap((c) =>
      c.networks
        .map((n) => ({
          code: c.code,
          name: c.name,
          icon: c.icon ?? null,
          notes: c.notes ?? null,
          networkId: idByNetwork.get(n.network),
        }))
        .filter((r): r is typeof r & { networkId: number } => !!r.networkId),
    );
    await prisma.$transaction([
      prisma.currency.deleteMany({}),
      prisma.currency.createMany({ data: rows }),
    ]);

    return NextResponse.json({
      ok: true,
      networks: networkByCode.size,
      currencies: rows.length,
    });
  } catch (error) {
    console.error("Exolix sync failed", error);
    return NextResponse.json(
      { error: "Sync failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Vercel Cron issues GET; manual triggers may use POST.
export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
