import crypto from "crypto";
import { NextRequest } from "next/server";

const COOKIE_NAME = "sv_admin";

function expectedToken() {
  const secret = process.env.SESSION_SECRET || "";
  const password = process.env.ADMIN_PASSWORD || "";
  return crypto.createHmac("sha256", secret).update("admin-session:" + password).digest("hex");
}

export function checkAdminPassword(password: string) {
  return Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD;
}

export function adminCookieName() {
  return COOKIE_NAME;
}

export function adminCookieValue() {
  return expectedToken();
}

export function isAdmin(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  const expected = expectedToken();
  const a = Buffer.from(cookie);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
