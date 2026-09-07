import { NextResponse } from "next/server";
import { getCategoryTileCounts } from "../../../../lib/seed-data";

export async function GET() {
  return NextResponse.json(getCategoryTileCounts());
}
