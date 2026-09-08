import { NextResponse } from "next/server";
import { getTierPrices } from "@/lib/tierPricing";

// Public: every page that displays a price reads it from here, live.
export async function GET() {
  const prices = await getTierPrices();
  return NextResponse.json(prices);
}
