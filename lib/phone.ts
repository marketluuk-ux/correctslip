import { NextRequest } from "next/server";

export const PHONE_COOKIE = "sv_phone";

// Accepts local (0803...) or international (+234803... / 234803...) Nigerian
// formats and normalizes to the local 11-digit 0-prefixed form.
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 13 && digits.startsWith("234")) return "0" + digits.slice(3);
  if (digits.length === 10) return "0" + digits;
  return null;
}

export function getPhone(req: NextRequest): string | null {
  return req.cookies.get(PHONE_COOKIE)?.value ?? null;
}

export function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 4) + "***" + phone.slice(-3);
}
