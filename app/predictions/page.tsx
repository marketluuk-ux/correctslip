"use client";

import { useEffect, useState, useCallback } from "react";
import { ApiMatch } from "@/lib/types";
import MatchCard from "@/components/MatchCard";
import CheckoutModal from "@/components/CheckoutModal";
import PhoneGate from "@/components/PhoneGate";

const FILTERS = [
  { tier: "all", label: "All" },
  { tier: "1", label: "Tier I · Single" },
  { tier: "2", label: "Tier II · Accumulator" },
  { tier: "3", label: "Tier III · Banker" },
  { tier: "4", label: "Tier IV · Correct Score" },
];

export default function PredictionsPage() {
  const [matches, setMatches] = useState<ApiMatch[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [checkoutMatch, setCheckoutMatch] = useState<ApiMatch | null>(null);

  const load = useCallback(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches))
      .catch(() => setMatches([]));
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const tierParam = params.get("tier");
    if (tierParam) setFilter(tierParam);
  }, [load]);

  const list = (matches ?? [])
    .filter((m) => !m.settled)
    .slice()
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
    .filter((m) => filter === "all" || String(m.tier) === filter);

  return (
    <main className="shell">
      <h2 className="section-title">Predictions</h2>
      <p className="section-sub">
        Every fixture on the board. Unlock a single pick, or come back once a card is already
        yours.
      </p>

      <PhoneGate
        prompt="Already sent a transfer? Enter the number to reveal your confirmed picks:"
        onChange={load}
      />

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.tier}
            className={"filter" + (filter === f.tier ? " active" : "")}
            onClick={() => setFilter(f.tier)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {!matches ? (
        <div className="empty">Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty">No fixtures in this tier yet.</div>
      ) : (
        <div className="grid">
          {list.map((m) => (
            <MatchCard key={m.id} match={m} onUnlockClick={setCheckoutMatch} />
          ))}
        </div>
      )}
      {checkoutMatch && (
        <CheckoutModal match={checkoutMatch} onClose={() => setCheckoutMatch(null)} onUnlocked={load} />
      )}
    </main>
  );
}
