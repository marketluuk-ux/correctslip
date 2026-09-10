"use client";

const KEY = "sv_ref_code";

// Whoever's phone is in the link gets credit for the new visitor it
// brought in. Captured once on landing, sent along on that visitor's own
// first checkout — nothing server-side needs to run just to land here.
export function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && ref.trim()) {
      localStorage.setItem(KEY, ref.trim());
    }
  } catch {}
}

export function getStoredReferral(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function buildShareUrl(path: string, myPhone: string | null): string {
  if (typeof window === "undefined") return path;
  const url = new URL(path, window.location.origin);
  if (myPhone) url.searchParams.set("ref", myPhone);
  return url.toString();
}
