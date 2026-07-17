import { NextRequest, NextResponse } from "next/server";
import { exolixGet, ExolixError } from "@/lib/server/exolix";

// GET /api/exolix/transactions/[id] — poll transaction status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = await exolixGet(`/transactions/${encodeURIComponent(id)}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ExolixError) {
      return NextResponse.json(error.data, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
  }
}
