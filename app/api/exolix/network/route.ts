import { prisma } from "@/lib/prisma";
import { getExolixFallback } from "@/lib/server/exolix-cache";
import { NextResponse } from "next/server";

// The Postgres cache is the preferred source; when it is unreachable or
// empty, fall back to a server-side cached pull from the Exolix API.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const networks = await prisma.network.findMany();
    if (networks.length > 0) return NextResponse.json(networks);
  } catch (error) {
    console.warn("Exolix network cache: database unavailable, using live fallback", error);
  }
  try {
    const { networks } = await getExolixFallback();
    return NextResponse.json(networks);
  } catch (error) {
    console.error("Error fetching networks", error);
    return NextResponse.json([]);
  }
}
