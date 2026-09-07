import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhone } from "@/lib/phone";

export async function GET(req: NextRequest) {
  const phone = getPhone(req);
  if (!phone) {
    return NextResponse.json({ phone: null, pending: [], unlocked: [], stats: null });
  }

  const unlocks = await prisma.unlock.findMany({
    where: { phone, status: { in: ["pending", "paid"] } },
    orderBy: { requestedAt: "desc" },
    include: { match: true },
  });

  const pending = unlocks
    .filter((u) => u.status === "pending")
    .map((u) => ({
      id: u.id,
      matchTitle: u.match.title,
      competition: u.match.competition,
      tier: u.tier,
      amount: u.amount,
      requestedAt: u.requestedAt.toISOString(),
    }));

  const unlocked = unlocks
    .filter((u) => u.status === "paid")
    .map((u) => ({
      id: u.id,
      matchTitle: u.match.title,
      competition: u.match.competition,
      tier: u.tier,
      amount: u.amount,
      pick: u.match.pick,
      settled: u.match.settled,
      result: u.match.result as "win" | "loss" | null,
      confirmedAt: (u.confirmedAt ?? u.requestedAt).toISOString(),
    }));

  const settledOfMine = unlocked.filter((u) => u.settled);
  const won = settledOfMine.filter((u) => u.result === "win").length;

  const stats = {
    totalUnlocked: unlocked.length,
    totalSpent: unlocked.reduce((s, u) => s + u.amount, 0),
    settledCount: settledOfMine.length,
    wonCount: won,
  };

  return NextResponse.json({ phone, pending, unlocked, stats });
}
