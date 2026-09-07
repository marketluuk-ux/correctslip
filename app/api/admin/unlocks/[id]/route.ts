import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { notifyBuyer } from "@/lib/push";

// The admin's manual confirm/reject action once they've checked the Opay
// account for a matching transfer.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));

  if (action === "confirm") {
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
  } else if (action === "reject") {
    await prisma.unlock.update({ where: { id }, data: { status: "rejected" } });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
