import { prisma } from "@/lib/prisma";
import { getAllExolixCurrencies } from "@/lib/server/exolix-cache";
import { dedupeNetworkRows, toCurrencyRows } from "@/lib/exolix-map";
import { NextRequest, NextResponse } from "next/server";

// Re-syncs the Exolix networks/currencies cache in Postgres.
// Runs daily via Vercel Cron and can be triggered manually with:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/exolix/sync

export const maxDuration = 60;

async function handler(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currencies = await getAllExolixCurrencies();

    // Networks: dedupe by Exolix network code, insert missing ones.
    const networkRows = dedupeNetworkRows(currencies);
    await prisma.network.createMany({
      data: networkRows as never,
      skipDuplicates: true,
    });

    const idByNetwork = new Map(
      (await prisma.network.findMany()).map((n) => [n.network, n.id]),
    );

    // Currencies: full refresh (one row per currency-network pair).
    const rows = toCurrencyRows(currencies, idByNetwork);
    await prisma.$transaction([
      prisma.currency.deleteMany({}),
      prisma.currency.createMany({ data: rows }),
    ]);

    return NextResponse.json({
      ok: true,
      networks: networkRows.length,
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
