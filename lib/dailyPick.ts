import { prisma } from "@/lib/prisma";
import { notifyDailySubscribers } from "@/lib/push";

const STALE_MS = 20 * 60 * 60 * 1000; // rotate at least once every 20h

/**
 * Keeps the free spotlight fresh without relying on the admin remembering
 * to change it. Correct Score (tier 4) is never eligible — same rule the
 * manual toggle enforces. Call this on a schedule (see instrumentation.ts
 * for the in-process version, /api/cron/rotate-pick for an external one).
 */
export async function ensureDailyFeaturedPick() {
  const now = Date.now();
  const current = await prisma.match.findFirst({ where: { featured: true } });

  const currentIsStale =
    !current ||
    current.settled ||
    current.kickoffAt.getTime() <= now ||
    !current.lastFeaturedAt ||
    now - current.lastFeaturedAt.getTime() > STALE_MS;

  if (!currentIsStale) return null;

  const candidates = await prisma.match.findMany({
    where: {
      tier: { in: [1, 2, 3] },
      settled: false,
      kickoffAt: { gt: new Date(now) },
      ...(current ? { id: { not: current.id } } : {}),
    },
    // Never-featured matches (null) sort first in SQLite ascending order,
    // then whichever's gone longest without a turn, then soonest kickoff.
    orderBy: [{ lastFeaturedAt: "asc" }, { kickoffAt: "asc" }],
    take: 1,
  });

  const next = candidates[0];

  if (current && (current.settled || current.kickoffAt.getTime() <= now)) {
    await prisma.match.update({ where: { id: current.id }, data: { featured: false } });
  }

  if (!next) return null;

  await prisma.$transaction([
    prisma.match.updateMany({ where: { featured: true }, data: { featured: false } }),
    prisma.match.update({
      where: { id: next.id },
      data: { featured: true, lastFeaturedAt: new Date() },
    }),
  ]);

  notifyDailySubscribers({
    title: "Today's free pick is live",
    body: `${next.title} — free, no payment needed.`,
    url: "/",
  }).catch(() => {});

  return next;
}
