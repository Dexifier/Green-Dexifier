import { NextRequest, NextResponse } from "next/server";
import { chainflipGet, ChainflipBrokerError } from "@/lib/server/chainflip";

// GET /api/chainflip/swap — request a deposit address from the broker
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const data = await chainflipGet("/swap", params);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ChainflipBrokerError) {
      return NextResponse.json(error.data, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to create swap" }, { status: 500 });
  }
}
