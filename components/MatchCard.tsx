"use client";

import { useEffect, useState } from "react";
import { ApiMatch } from "@/lib/types";
import { tierInfo, naira } from "@/lib/tiers";
import { countdownText } from "@/lib/format";

export default function MatchCard({
  match,
  onUnlockClick,
}: {
  match: ApiMatch;
  onUnlockClick: (match: ApiMatch) => void;
}) {
  const t = tierInfo(match.tier);
  const revealed = match.featured || match.unlocked;
  const kickedOff = new Date(match.kickoffAt).getTime() <= Date.now();
  const [clock, setClock] = useState("");

  useEffect(() => {
    setClock(countdownText(match.kickoffAt));
    const id = setInterval(() => setClock(countdownText(match.kickoffAt)), 1000);
    return () => clearInterval(id);
  }, [match.kickoffAt]);

  return (
    <div className={"card tier-" + match.tier}>
      {match.featured && <div className="ribbon">FREE</div>}
      <div className="card-top">
        <span className="comp">{match.competition}</span>
        <span className="kickoff mono">{clock}</span>
      </div>
      <div className="card-mid">
        <div className="title">{match.title}</div>
        {match.subtitle && <div className="subtitle">{match.subtitle}</div>}
        <div className="score-zone">
          {revealed ? (
            <div className="score-box open">{match.pick ?? "—"}</div>
          ) : (
            <div className="score-box locked">LOCKED</div>
          )}
        </div>
      </div>
      <div className="card-foot">
        <span className="tier-pill">Tier {t.code}</span>
        {match.featured ? (
          <span className="tag-unlocked">FREE PICK</span>
        ) : match.unlocked ? (
          <span className="tag-unlocked">✓ Unlocked</span>
        ) : kickedOff ? (
          <button className="btn small ghost" disabled title="This match has already kicked off">
            Picks closed
          </button>
        ) : (
          <button className="btn small" onClick={() => onUnlockClick(match)}>
            Unlock — {naira(t.price)}
          </button>
        )}
      </div>
    </div>
  );
}
