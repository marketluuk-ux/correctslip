"use client";

import { useEffect, useState } from "react";
import { ApiMatch } from "@/lib/types";
import { tierInfo } from "@/lib/tiers";
import { fmtKickoff } from "@/lib/format";

export default function TrackRecordPage() {
  const [matches, setMatches] = useState<ApiMatch[] | null>(null);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches))
      .catch(() => setMatches([]));
  }, []);

  const settled = (matches ?? [])
    .filter((m) => m.settled)
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime());
  const won = settled.filter((m) => m.result === "win").length;

  return (
    <main className="shell">
      <h2 className="section-title">Track record</h2>
      <p className="section-sub">
        Settled picks only, unedited. Losses stay on the log — a record with none is a record
        nobody should trust.
      </p>
      {matches && (
        <div className="stat-row" style={{ marginBottom: 22 }}>
          <div className="stat">
            <span className="k">Settled</span>
            <span className="v mono">{settled.length}</span>
          </div>
          <div className="stat">
            <span className="k">Won</span>
            <span className="v mono">{won}</span>
          </div>
          <div className="stat">
            <span className="k">Lost</span>
            <span className="v mono">{settled.length - won}</span>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table className="stack">
          <thead>
            <tr>
              <th>Kickoff</th>
              <th>Fixture</th>
              <th>Tier</th>
              <th className="mono">Pick</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {!matches ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--ink-soft)" }}>
                  Loading…
                </td>
              </tr>
            ) : settled.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--ink-soft)" }}>
                  No settled picks yet.
                </td>
              </tr>
            ) : (
              settled.map((m) => {
                const t = tierInfo(m.tier);
                return (
                  <tr key={m.id}>
                    <td className="mono" data-label="Kickoff">{fmtKickoff(m.kickoffAt)}</td>
                    <td data-label="Fixture">{m.title}</td>
                    <td data-label="Tier">Tier {t.code}</td>
                    <td className="mono" data-label="Pick">{m.pick}</td>
                    <td data-label="Result">
                      <span className={"badge " + (m.result === "win" ? "win" : "loss")}>
                        {m.result === "win" ? "WON" : "LOST"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
