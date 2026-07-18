import { NextRequest, NextResponse } from "next/server";
import { chainflipGet, ChainflipBrokerError } from "@/lib/server/chainflip";

// GET /api/chainflip/status?swapId=123 — poll swap status
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const data = await chainflipGet("/status-by-id", params);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ChainflipBrokerError) {
      return NextResponse.json(error.data, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch swap status" }, { status: 500 });
  }
}
