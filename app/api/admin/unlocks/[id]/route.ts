import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { notifyBuyer } from "@/lib/push";
import { grantCredit, REFERRAL_REWARD } from "@/lib/referralCredit";

// The admin's manual confirm/reject action once they've checked the Opay
// account for a matching transfer.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));

  if (action === "confirm") {
    const target = await prisma.unlock.findUnique({ where: { id }, select: { phone: true } });
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check "is this their first-ever paid unlock" before updating this
    // one to paid, so the count doesn't include itself.
    const priorPaidCount = await prisma.unlock.count({
      where: { id: { not: id }, status: "paid", phone: target.phone },
    });

    const unlock = await prisma.unlock.update({
      where: { id },
      data: { status: "paid", confirmedAt: new Date() },
      include: { match: { select: { title: true } } },
    });

    notifyBuyer(unlock.phone, {
      title: "Your pick is unlocked",
      body: `${unlock.match.title} is yours now — open My Picks to see it.`,
      url: "/my-picks",
    }).catch(() => {});

    // Two-sided referral reward: both people get something, not just the
    // one who shared. Only on the referred buyer's genuine first purchase,
    // so the same relationship can't be farmed on every repeat buy.
    if (unlock.referredBy && priorPaidCount === 0) {
      await grantCredit(
        unlock.referredBy,
        REFERRAL_REWARD,
        `Referral reward — ${unlock.phone} bought their first pick`
      );
      await grantCredit(
        unlock.phone,
        REFERRAL_REWARD,
        `Welcome credit — referred by ${unlock.referredBy}`
      );
      notifyBuyer(unlock.referredBy, {
        title: "You earned ₦500 credit",
        body: "Someone you referred just made their first purchase — your free Single pick is ready.",
        url: "/predictions",
      }).catch(() => {});
    }
  } else if (action === "reject") {
    await prisma.unlock.update({ where: { id }, data: { status: "rejected" } });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
