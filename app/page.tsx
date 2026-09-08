"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiMatch } from "@/lib/types";
import { TIERS, naira } from "@/lib/tiers";
import MatchCard from "@/components/MatchCard";
import { bumpStreak } from "@/lib/streak";
import { useTierPrices } from "@/lib/useTierPrices";
import { subscribeToPush, pushSupported } from "@/lib/clientPush";
import { toast } from "@/components/Toaster";

export default function HomePage() {
  const [matches, setMatches] = useState<ApiMatch[] | null>(null);
  const [streak, setStreak] = useState(0);
  const [dailyPush, setDailyPush] = useState<"idle" | "asking" | "on" | "denied" | "unsupported">("idle");
  const prices = useTierPrices();

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches))
      .catch(() => setMatches([]));

    setStreak(bumpStreak());

    if (!pushSupported()) {
      setDailyPush("unsupported");
    } else {
      try {
        if (localStorage.getItem("sv_daily_push") === "on") setDailyPush("on");
      } catch {}
    }
  }, []);

  async function enableDailyPush() {
    setDailyPush("asking");
    const result = await subscribeToPush("daily");
    if (result === "subscribed") {
      setDailyPush("on");
      try {
        localStorage.setItem("sv_daily_push", "on");
      } catch {}
      toast("You'll be notified when a new free pick drops.");
    } else if (result === "denied") {
      setDailyPush("denied");
    } else {
      setDailyPush("unsupported");
    }
  }

  const settled = (matches ?? []).filter((m) => m.settled);
  const won = settled.filter((m) => m.result === "win");
  const rate = settled.length ? Math.round((won.length / settled.length) * 100) + "%" : "—";
  const live = (matches ?? []).filter((m) => !m.settled).length;
  const featured = (matches ?? []).find((m) => m.featured && !m.settled) ?? null;

  return (
    <main className="shell">
      <div className="hero">
        <h1>
          Football picks,
          <br />
          <em>paid to be right.</em>
        </h1>
        <p>
          Four tiers, one free pick a day. Every result — win or lose — stays on the record below.
          Nothing is guaranteed; the price buys the work, not the outcome.
        </p>
        <Link href="/predictions" className="btn">
          Browse predictions
        </Link>
        <div className="stat-row">
          <div className="stat">
            <span className="k">Settled</span>
            <span className="v mono">{matches ? settled.length : "—"}</span>
          </div>
          <div className="stat">
            <span className="k">Win rate</span>
            <span className="v mono">{matches ? rate : "—"}</span>
          </div>
          <div className="stat">
            <span className="k">Live now</span>
            <span className="v mono">{matches ? live : "—"}</span>
          </div>
        </div>
      </div>

      <div className="free-wrap">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            Today&rsquo;s free pick
          </h2>
          {streak >= 2 && <span className="streak-badge">{streak}-day streak</span>}
        </div>
        <p className="section-sub">
          One match, chosen by the house, unlocked for everyone — no payment, no account. This is
          proof, not a sample size.
          {streak >= 2 && " Come back tomorrow to keep your streak going."}
        </p>
        {!matches ? (
          <div className="empty">Loading…</div>
        ) : featured ? (
          <>
            <div className="grid" style={{ gridTemplateColumns: "minmax(260px, 340px)" }}>
              <MatchCard match={featured} onUnlockClick={() => {}} />
            </div>
            {dailyPush !== "on" && dailyPush !== "unsupported" && (
              <button
                className="btn ghost small"
                style={{ marginTop: 14 }}
                onClick={enableDailyPush}
                disabled={dailyPush === "asking"}
              >
                {dailyPush === "asking"
                  ? "Asking…"
                  : dailyPush === "denied"
                    ? "Notifications blocked — check browser settings"
                    : "Notify me when a new free pick drops"}
              </button>
            )}
          </>
        ) : (
          <div className="empty">No free pick live right now — check back soon.</div>
        )}
      </div>

      <div>
        <h2 className="section-title">The staircase</h2>
        <p className="section-sub">
          Start at Tier I. Each tier is priced higher because the market gets harder to call — not
          because the pick is more &ldquo;certain.&rdquo;
        </p>
        <div className="grid">
          {([1, 2, 3, 4] as const).map((tn) => {
            const t = TIERS[tn];
            return (
              <Link
                key={tn}
                href={`/predictions?tier=${tn}`}
                className="card"
                style={{ cursor: "pointer" }}
              >
                <div className="card-mid" style={{ paddingTop: 22 }}>
                  <div className="tier-pill" style={{ marginBottom: 10 }}>
                    Tier {t.code}
                  </div>
                  <div className="title">{t.name}</div>
                  <div className="price mono" style={{ marginTop: 10, fontSize: 20 }}>
                    {naira(prices[tn])}
                  </div>
                  {tn === 4 && (
                    <div className="cadence-note" style={{ marginTop: 6, marginLeft: 0 }}>
                      comes ~weekly
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
