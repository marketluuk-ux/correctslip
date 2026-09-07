import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const rows = await prisma.unlock.findMany({
    where: { status: "pending" },
    orderBy: { requestedAt: "asc" },
    include: { match: { select: { title: true, competition: true } } },
  });
  return NextResponse.json({
    pending: rows.map((u) => ({
      id: u.id,
      matchId: u.matchId,
      matchTitle: u.match.title,
      competition: u.match.competition,
      phone: u.phone,
      tier: u.tier,
      amount: u.amount,
      requestedAt: u.requestedAt.toISOString(),
    })),
  });
}
