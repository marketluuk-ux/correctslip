import { NextRequest, NextResponse } from "next/server";
import { ensureDailyFeaturedPick } from "@/lib/dailyPick";

// Wire an external scheduler (Vercel Cron, cron-job.org, etc.) to POST here
// hourly with `Authorization: Bearer $CRON_SECRET`. The in-process scheduler
// in instrumentation.ts already covers this while the app runs as a
// persistent Node server — this route exists for when it doesn't (see
// README's serverless note).
export async function POST(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
  }
  const rotated = await ensureDailyFeaturedPick();
  return NextResponse.json({ rotated: rotated ? rotated.title : null });
}
