"use client";

import { useState } from "react";
import { PendingUnlock } from "@/lib/types";
import { tierInfo, naira } from "@/lib/tiers";
import { relTime } from "@/lib/format";

export default function PendingTransferCard({
  item,
  onDecide,
}: {
  item: PendingUnlock;
  onDecide: (id: string, action: "confirm" | "reject") => void;
}) {
  const [asking, setAsking] = useState<"confirm" | "reject" | null>(null);
  const t = tierInfo(item.tier);

  if (asking) {
    return (
      <div className="pending-card pending-card-asking">
        <div className="pending-card-question">
          {asking === "confirm" ? (
            <>
              You received <strong className="mono">{naira(item.amount)}</strong> from{" "}
              <strong className="mono">{item.phone}</strong>? This unlocks the pick — it
              can&rsquo;t be undone after.
            </>
          ) : (
            <>
              Reject this request from <strong className="mono">{item.phone}</strong>? Use this
              only if the money never arrived.
            </>
          )}
        </div>
        <div className="pending-card-actions">
          <button className="btn ghost" onClick={() => setAsking(null)}>
            Go back
          </button>
          <button
            className={asking === "confirm" ? "btn" : "btn danger"}
            onClick={() => onDecide(item.id, asking)}
          >
            Yes, I&rsquo;m sure
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-card">
      <div className="pending-card-top">
        <span className="pending-card-time mono">{relTime(item.requestedAt)}</span>
        <span className="tier-pill">Tier {t.code}</span>
      </div>
      <div className="pending-card-match">{item.matchTitle}</div>
      <div className="pending-card-comp">{item.competition}</div>
      <div className="pending-card-key">
        <div>
          <div className="k-label">Amount to look for</div>
          <div className="pending-card-amount mono">{naira(item.amount)}</div>
        </div>
        <div>
          <div className="k-label">Sender&rsquo;s number</div>
          <div className="pending-card-phone mono">{item.phone}</div>
        </div>
      </div>
      <div className="pending-card-actions">
        <button className="btn small" onClick={() => setAsking("confirm")}>
          Yes, I received it
        </button>
        <button className="btn small danger" onClick={() => setAsking("reject")}>
          No, reject
        </button>
      </div>
    </div>
  );
}
