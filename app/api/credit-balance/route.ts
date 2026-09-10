import { NextRequest, NextResponse } from "next/server";
import { getCreditBalance } from "@/lib/referralCredit";
import { normalizePhone } from "@/lib/phone";

// Public, phone-as-param — consistent with the rest of this app, which
// never verifies phone ownership anywhere (no OTP). Same trust model as
// checkout itself: the number is a claim, not a login.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("phone") ?? "";
  const phone = normalizePhone(raw);
  if (!phone) {
    return NextResponse.json({ balance: 0 });
  }
  const balance = await getCreditBalance(phone);
  return NextResponse.json({ balance });
}
