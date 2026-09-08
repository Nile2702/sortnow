import { NextResponse } from "next/server";
import { getAllShops } from "../../../../lib/seed-data";

// Full store directory - powers the standalone /shops page.
export async function GET() {
  return NextResponse.json(getAllShops());
}
