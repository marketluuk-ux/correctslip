import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const [allAmounts, recent] = await Promise.all([
    prisma.referralCredit.findMany({ select: { amount: true } }),
    prisma.referralCredit.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const granted = allAmounts.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const spent = allAmounts.filter((r) => r.amount < 0).reduce((s, r) => s + -r.amount, 0);

  return NextResponse.json({
    granted,
    spent,
    outstanding: granted - spent,
    recent: recent.map((r) => ({
      id: r.id,
      phone: r.phone,
      amount: r.amount,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
