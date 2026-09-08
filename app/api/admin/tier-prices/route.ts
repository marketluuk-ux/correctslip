import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { getTierPrices, setTierPrices } from "@/lib/tierPricing";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  return NextResponse.json(await getTierPrices());
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parse = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const prices = {
    1: parse(body[1]),
    2: parse(body[2]),
    3: parse(body[3]),
    4: parse(body[4]),
  };
  if (Object.values(prices).some((p) => p === null)) {
    return NextResponse.json({ error: "Every tier needs a price above zero" }, { status: 400 });
  }
  await setTierPrices(prices as { 1: number; 2: number; 3: number; 4: number });
  return NextResponse.json({ ok: true });
}
