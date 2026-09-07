import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tierInfo, naira } from "@/lib/tiers";
import { normalizePhone, PHONE_COOKIE } from "@/lib/phone";
import { notifyAdmins } from "@/lib/push";

// No payment gateway here — this creates a "pending" request for a manual
// bank transfer. An admin confirms it by hand once the transfer lands in
// the Opay account (see /api/admin/pending and /api/admin/unlocks/[id]).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { matchId, phone: rawPhone } = body ?? {};

  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!matchId || !phone) {
    return NextResponse.json(
      { error: "Enter a valid Nigerian phone number (e.g. 080XXXXXXXX)." },
      { status: 400 }
    );
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Already paid for — let them back in regardless of kickoff; this isn't a
  // new sale, just re-confirming access they already have.
  const existingPaid = await prisma.unlock.findFirst({
    where: { matchId, phone, status: "paid" },
  });
  if (existingPaid) {
    const res = NextResponse.json({ ok: true, alreadyUnlocked: true });
    res.cookies.set(PHONE_COOKIE, phone, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
    return res;
  }

  if (match.featured) {
    return NextResponse.json({ error: "This pick is already free" }, { status: 400 });
  }
  if (match.kickoffAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "This match has already kicked off — picks are closed." },
      { status: 400 }
    );
  }

  const existingPending = await prisma.unlock.findFirst({
    where: { matchId, phone, status: "pending" },
  });
  if (!existingPending) {
    const price = tierInfo(match.tier).price;
    await prisma.unlock.create({
      data: { matchId, phone, tier: match.tier, amount: price, status: "pending" },
    });
    notifyAdmins({
      title: "New transfer to confirm",
      body: `${phone} says they sent ${naira(price)} for ${match.title}`,
      url: "/admin",
    }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true, pending: true });
  res.cookies.set(PHONE_COOKIE, phone, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
