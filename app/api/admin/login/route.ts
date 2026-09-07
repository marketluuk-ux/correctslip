import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, adminCookieName, adminCookieValue } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!checkAdminPassword(password ?? "")) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName(), adminCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return res;
}
