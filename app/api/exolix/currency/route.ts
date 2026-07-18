import { prisma } from "@/lib/prisma";
import { getExolixFallback } from "@/lib/server/exolix-cache";
import { NextResponse } from "next/server";

// The Postgres cache is the preferred source; when it is unreachable or
// empty, fall back to a server-side cached pull from the Exolix API so the
// coin list (XMR & co.) keeps working.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const currencies = await prisma.currency.findMany();
    if (currencies.length > 0) return NextResponse.json(currencies);
  } catch (error) {
    console.warn("Exolix currency cache: database unavailable, using live fallback", error);
  }
  try {
    const { currencies } = await getExolixFallback();
    return NextResponse.json(currencies);
  } catch (error) {
    console.error("Error fetching currencies", error);
    return NextResponse.json([]);
  }
}
