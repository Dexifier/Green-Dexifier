import { NextRequest, NextResponse } from "next/server";
import { exolixPost, ExolixError } from "@/lib/server/exolix";

// POST /api/exolix/transactions  — create a swap transaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await exolixPost("/transactions", body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ExolixError) {
      return NextResponse.json(error.data, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
