import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { getPhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { role, subscription } = body ?? {};

  if (
    (role !== "buyer" && role !== "admin" && role !== "daily") ||
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  let phone: string | null = null;
  if (role === "buyer") {
    phone = getPhone(req);
    if (!phone) {
      return NextResponse.json({ error: "No phone on this device yet" }, { status: 400 });
    }
  } else if (role === "admin") {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
  }
  // role === "daily": anonymous, no phone or auth needed — just an opt-in
  // to hear when a new free pick goes live.

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { role, phone, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      role,
      phone,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}
