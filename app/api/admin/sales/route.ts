import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { SalesData } from "@/lib/types";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const unlocks = await prisma.unlock.findMany({
    where: { status: "paid" },
    orderBy: { confirmedAt: "desc" },
    take: 50,
    include: { match: { select: { title: true } } },
  });

  const totalRevenue = unlocks.reduce((s, u) => s + u.amount, 0);
  const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  unlocks.forEach((u) => {
    byTier[u.tier] = (byTier[u.tier] ?? 0) + 1;
  });

  const data: SalesData = {
    totalRevenue,
    totalPurchases: unlocks.length,
    byTier,
    recent: unlocks.slice(0, 15).map((u) => ({
      id: u.id,
      matchId: u.matchId,
      matchTitle: u.match.title,
      tier: u.tier,
      amount: u.amount,
      phone: u.phone,
      paidAt: (u.confirmedAt ?? u.requestedAt).toISOString(),
    })),
  };

  return NextResponse.json(data);
}
