import { NextRequest, NextResponse } from "next/server";
import { getPhone, normalizePhone, maskPhone, PHONE_COOKIE } from "@/lib/phone";

export async function GET(req: NextRequest) {
  const phone = getPhone(req);
  // `phone` stays masked for display everywhere else; `sharePhone` is the
  // one place the raw value comes back — it's the owner's own number,
  // going into a link they're about to send out themselves.
  return NextResponse.json({ phone: phone ? maskPhone(phone) : null, sharePhone: phone });
}

// Lets a returning buyer re-identify themselves (e.g. new browser/device)
// so previously confirmed unlocks show up without re-paying.
export async function POST(req: NextRequest) {
  const { phone: rawPhone } = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!phone) {
    return NextResponse.json({ error: "Enter a valid Nigerian phone number." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, phone: maskPhone(phone) });
  res.cookies.set(PHONE_COOKIE, phone, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PHONE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
