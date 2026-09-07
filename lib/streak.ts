"use client";

// A lightweight, per-browser habit nudge — not server-verified, just a
// loss-aversion cue ("don't break the streak") to reinforce a daily check-in.
export function bumpStreak(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastVisit = localStorage.getItem("sv_last_visit");
    if (lastVisit === today) {
      return parseInt(localStorage.getItem("sv_streak") ?? "1", 10);
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const prevStreak = parseInt(localStorage.getItem("sv_streak") ?? "0", 10);
    const streak = lastVisit === yesterday ? prevStreak + 1 : 1;

    localStorage.setItem("sv_last_visit", today);
    localStorage.setItem("sv_streak", String(streak));
    return streak;
  } catch {
    return 0;
  }
}
