// Runs once when the server process starts (Next.js instrumentation hook).
// Keeps the free spotlight rotating on its own for as long as this stays a
// persistent Node server. On a serverless host this hook still runs per
// cold start but setInterval won't survive between invocations — point an
// external scheduler at POST /api/cron/rotate-pick instead (see README).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureDailyFeaturedPick } = await import("@/lib/dailyPick");

  ensureDailyFeaturedPick().catch(() => {});
  setInterval(() => {
    ensureDailyFeaturedPick().catch(() => {});
  }, 60 * 60 * 1000);
}
