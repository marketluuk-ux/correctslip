import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhone } from "@/lib/phone";
import { isAdmin } from "@/lib/adminAuth";
import { ApiMatch } from "@/lib/types";

export async function GET(req: NextRequest) {
  const phone = getPhone(req);
  const admin = isAdmin(req);

  const [matches, paidUnlocks] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoffAt: "asc" } }),
    phone
      ? prisma.unlock.findMany({
          where: { phone, status: "paid" },
          select: { matchId: true },
        })
      : Promise.resolve([]),
  ]);

  const unlockedSet = new Set(paidUnlocks.map((u) => u.matchId));

  const out: ApiMatch[] = matches.map((m) => {
    const unlocked = unlockedSet.has(m.id);
    // Settled picks are historical proof and stay visible to everyone —
    // withholding them would defeat the point of the track record.
    const includePick = m.featured || unlocked || admin || m.settled;
    return {
      id: m.id,
      title: m.title,
      subtitle: m.subtitle,
      competition: m.competition,
      kickoffAt: m.kickoffAt.toISOString(),
      tier: m.tier,
      featured: m.featured,
      settled: m.settled,
      result: (m.result as "win" | "loss" | null) ?? null,
      unlocked,
      ...(includePick ? { pick: m.pick } : {}),
    };
  });

  return NextResponse.json({ matches: out });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, subtitle, competition, kickoffAt, tier, pick } = body ?? {};

  if (!title || !competition || !kickoffAt || !pick || ![1, 2, 3, 4].includes(Number(tier))) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const match = await prisma.match.create({
    data: {
      title: String(title).trim(),
      subtitle: subtitle ? String(subtitle).trim() : null,
      competition: String(competition).trim(),
      kickoffAt: new Date(kickoffAt),
      tier: Number(tier),
      pick: String(pick).trim(),
    },
  });

  return NextResponse.json({ id: match.id });
}
