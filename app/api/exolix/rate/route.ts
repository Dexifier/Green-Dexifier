import { NextRequest, NextResponse } from "next/server";
import { exolixGet, ExolixError } from "@/lib/server/exolix";

// GET /api/exolix/rate?coinFrom=BTC&networkFrom=BTC&coinTo=ETH&networkTo=ETH&amount=0.1&rateType=float
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const data = await exolixGet("/rate", params);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ExolixError) {
      return NextResponse.json(error.data, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch rate" }, { status: 500 });
  }
}
