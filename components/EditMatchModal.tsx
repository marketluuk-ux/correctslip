"use client";

import { useState } from "react";
import { ApiMatch } from "@/lib/types";
import { TIERS, naira } from "@/lib/tiers";
import { toast } from "@/components/Toaster";

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditMatchModal({
  match,
  onClose,
  onSaved,
}: {
  match: ApiMatch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      subtitle: fd.get("subtitle"),
      competition: fd.get("competition"),
      kickoffAt: fd.get("kickoff") ? new Date(String(fd.get("kickoff"))).toISOString() : null,
      tier: Number(fd.get("tier")),
      pick: fd.get("pick"),
    };
    setSaving(true);
    const res = await fetch(`/api/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      toast("Match updated.");
      onSaved();
      onClose();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not save.");
    }
  }

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: 460 }}>
        <h3>Edit match</h3>

        {match.settled ? (
          <>
            <div className="m-note">
              This match is settled and already showing on Track Record as{" "}
              <strong>{match.result === "win" ? "WON" : "LOST"}</strong>. That log is proof
              precisely because it doesn&rsquo;t change after the fact — reopen it from Manage
              matches first if this genuinely needs a correction, then it can be edited.
            </div>
            <div className="m-actions">
              <button type="button" className="btn" onClick={onClose}>
                Got it
              </button>
            </div>
          </>
        ) : (
        <>
        <div className="m-sub">Changes apply immediately — including to any card already on Predictions.</div>

        <form onSubmit={save}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Fixture / title</label>
            <input name="title" type="text" defaultValue={match.title} required />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Subtitle (optional)</label>
            <input name="subtitle" type="text" defaultValue={match.subtitle ?? ""} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Competition</label>
            <input name="competition" type="text" defaultValue={match.competition} required />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Kickoff</label>
            <input
              name="kickoff"
              type="datetime-local"
              defaultValue={toLocalInputValue(match.kickoffAt)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Tier</label>
            <select name="tier" defaultValue={String(match.tier)}>
              {([1, 2, 3, 4] as const).map((tn) => (
                <option key={tn} value={tn}>
                  Tier {TIERS[tn].code} — {TIERS[tn].name} ({naira(TIERS[tn].price)})
                </option>
              ))}
            </select>
            {match.featured && (
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 5 }}>
                Currently the free spotlight — switching to Tier IV will remove it from there.
              </div>
            )}
          </div>
          <div className="field" style={{ marginBottom: 4 }}>
            <label>Pick</label>
            <input name="pick" type="text" defaultValue={match.pick ?? ""} required />
          </div>

          <div className="m-actions">
            <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
