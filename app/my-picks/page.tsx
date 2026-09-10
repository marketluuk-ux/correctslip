"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PhoneGate from "@/components/PhoneGate";
import { tierInfo, naira } from "@/lib/tiers";
import { relTime } from "@/lib/format";
import { subscribeToPush, pushSupported } from "@/lib/clientPush";
import { buildShareUrl } from "@/lib/referral";
import ShareButton from "@/components/ShareButton";
import { toast } from "@/components/Toaster";

type Pending = {
  id: string;
  matchTitle: string;
  competition: string;
  tier: number;
  amount: number;
  requestedAt: string;
};
type Unlocked = {
  id: string;
  matchTitle: string;
  competition: string;
  tier: number;
  amount: number;
  pick: string;
  settled: boolean;
  result: "win" | "loss" | null;
  confirmedAt: string;
};
type MyPicksData = {
  phone: string | null;
  pending: Pending[];
  unlocked: Unlocked[];
  stats: { totalUnlocked: number; totalSpent: number; settledCount: number; wonCount: number } | null;
};

export default function MyPicksPage() {
  const [data, setData] = useState<MyPicksData | null>(null);
  const [credit, setCredit] = useState(0);
  const [pushState, setPushState] = useState<"idle" | "asking" | "on" | "denied" | "unsupported">("idle");

  const load = useCallback(() => {
    fetch("/api/my-picks")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    load();
    if (!pushSupported()) setPushState("unsupported");
  }, [load]);

  useEffect(() => {
    if (!data?.phone) {
      setCredit(0);
      return;
    }
    fetch(`/api/credit-balance?phone=${encodeURIComponent(data.phone)}`)
      .then((r) => r.json())
      .then((d) => setCredit(d.balance ?? 0))
      .catch(() => setCredit(0));
  }, [data?.phone]);

  async function enableNotify() {
    setPushState("asking");
    const result = await subscribeToPush("buyer");
    if (result === "subscribed") {
      setPushState("on");
      toast("You'll be notified the moment a transfer is confirmed.");
    } else if (result === "denied") {
      setPushState("denied");
    } else {
      setPushState("unsupported");
    }
  }

  return (
    <main className="shell">
      <h2 className="section-title">My picks</h2>
      <p className="section-sub">
        Every pick tied to your number, in one place — what&rsquo;s waiting, what&rsquo;s yours,
        and how it&rsquo;s gone so far.
      </p>

      <PhoneGate
        prompt="Enter the number you paid with to see your picks:"
        onChange={() => load()}
      />

      {!data ? (
        <div className="empty">Loading…</div>
      ) : !data.phone ? (
        <div className="empty">
          Once you unlock a pick, or check a number above, everything tied to it shows up here —
          pending transfers, confirmed picks, and how they turned out.
        </div>
      ) : (
        <>
          {data.stats && data.stats.totalUnlocked > 0 && (
            <div className="stat-row" style={{ marginBottom: 28 }}>
              <div className="stat">
                <span className="k">Unlocked</span>
                <span className="v mono">{data.stats.totalUnlocked}</span>
              </div>
              <div className="stat">
                <span className="k">Spent</span>
                <span className="v mono">{naira(data.stats.totalSpent)}</span>
              </div>
              {data.stats.settledCount > 0 && (
                <div className="stat">
                  <span className="k">Your win rate</span>
                  <span className="v mono">
                    {Math.round((data.stats.wonCount / data.stats.settledCount) * 100)}%
                  </span>
                </div>
              )}
              {credit > 0 && (
                <div className="stat">
                  <span className="k">Referral credit</span>
                  <span className="v mono">{naira(credit)}</span>
                </div>
              )}
            </div>
          )}

          <div className="banner banner-row" style={{ justifyContent: "space-between" }}>
            <span>
              Refer a friend — you both get ₦500 credit once they make their first pick.
            </span>
            <ShareButton
              label="Share your link"
              text="Come check out CorrectSlip — football picks with a published track record. Use my link and we both get ₦500 credit when you make your first pick:"
              url={buildShareUrl("/", data.phone)}
            />
          </div>

          <div className="admin-block">
            <h2 className="section-title">Waiting for confirmation</h2>
            <p className="section-sub">
              {data.pending.length === 0
                ? "Nothing waiting right now."
                : "These are already yours in principle — an admin just needs to see the transfer land. Most are confirmed within a few hours."}
            </p>

            {data.pending.length > 0 && pushState !== "on" && pushState !== "unsupported" && (
              <div className="banner banner-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
                <span>Want a notification the second this is confirmed, instead of checking back?</span>
                <button className="btn small" onClick={enableNotify} disabled={pushState === "asking"}>
                  {pushState === "asking" ? "Asking…" : pushState === "denied" ? "Blocked — check browser settings" : "Notify me"}
                </button>
              </div>
            )}

            {data.pending.length > 0 && (
              <div className="grid">
                {data.pending.map((p) => {
                  const t = tierInfo(p.tier);
                  return (
                    <div className="card" key={p.id}>
                      <div className="card-top">
                        <span className="comp">{p.competition}</span>
                        <span className="kickoff mono">{relTime(p.requestedAt)}</span>
                      </div>
                      <div className="card-mid">
                        <div className="title">{p.matchTitle}</div>
                        <div className="score-zone">
                          <div className="score-box locked">CHECKING</div>
                        </div>
                      </div>
                      <div className="card-foot">
                        <span className="tier-pill">Tier {t.code}</span>
                        <span className="price mono">{naira(p.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-block">
            <h2 className="section-title">Unlocked</h2>
            <p className="section-sub">
              {data.unlocked.length === 0
                ? "Nothing unlocked yet — confirmed picks land here."
                : "Yours for good — these don't expire."}
            </p>
            {data.unlocked.length > 0 && (
              <div className="grid">
                {data.unlocked.map((u) => {
                  const t = tierInfo(u.tier);
                  return (
                    <div className="card" key={u.id}>
                      <div className="card-top">
                        <span className="comp">{u.competition}</span>
                        <span className="kickoff mono">
                          {u.settled ? (u.result === "win" ? "WON" : "LOST") : "UPCOMING"}
                        </span>
                      </div>
                      <div className="card-mid">
                        <div className="title">{u.matchTitle}</div>
                        <div className="score-zone">
                          <div className="score-box open">{u.pick}</div>
                        </div>
                      </div>
                      <div className="card-foot">
                        <span className="tier-pill">Tier {t.code}</span>
                        <span className="tag-unlocked">✓ Unlocked</span>
                      </div>
                      {u.settled && u.result === "win" && (
                        <div style={{ padding: "0 14px 14px" }}>
                          <ShareButton
                            className="btn small"
                            style={{ width: "100%" }}
                            label="Share this win"
                            text={`Called it: ${u.matchTitle} — ${u.pick}. Got it from CorrectSlip before kickoff. Use my link and we both get ₦500 credit on your first pick:`}
                            url={buildShareUrl("/", data.phone)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {data.unlocked.length === 0 && data.pending.length === 0 && (
              <Link href="/predictions" className="btn">
                Browse predictions
              </Link>
            )}
          </div>
        </>
      )}
    </main>
  );
}
