"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiMatch, SalesData, PendingUnlock } from "@/lib/types";
import { TIERS, tierInfo, naira } from "@/lib/tiers";
import { fmtKickoff, relTime } from "@/lib/format";
import { BankTransferAccount } from "@/lib/payment";
import { subscribeToPush, pushSupported } from "@/lib/clientPush";
import { toast } from "@/components/Toaster";
import EditMatchModal from "@/components/EditMatchModal";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [editingMatch, setEditingMatch] = useState<ApiMatch | null>(null);
  const [sales, setSales] = useState<SalesData | null>(null);
  const [pending, setPending] = useState<PendingUnlock[]>([]);
  const [account, setAccount] = useState<BankTransferAccount | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "asking" | "on" | "denied" | "unsupported">("idle");
  const baseTitle = useRef<string>("");

  const loadMatches = useCallback(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches));
  }, []);

  const loadPending = useCallback(() => {
    fetch("/api/admin/pending")
      .then((r) => r.json())
      .then((d) => setPending(d.pending ?? []));
  }, []);

  const loadAccount = useCallback(() => {
    fetch("/api/admin/payment-account")
      .then((r) => r.json())
      .then(setAccount);
  }, []);

  const loadSales = useCallback(() => {
    fetch("/api/admin/sales").then((r) => {
      if (r.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      r.json().then(setSales);
    });
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    if (authed) {
      loadMatches();
      loadPending();
      loadAccount();
    }
  }, [authed, loadMatches, loadPending, loadAccount]);

  // Poll for new pending transfers while this tab is open — the push
  // notification (if granted) covers the "tab closed" case; this covers
  // "tab open in the background".
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(loadPending, 25000);
    return () => clearInterval(id);
  }, [authed, loadPending]);

  // Surface the pending count in the tab title so it's visible even when
  // this tab isn't focused — the same open-loop pressure a notification
  // badge creates, with zero extra permissions needed.
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title;
    document.title = pending.length > 0 ? `(${pending.length}) ${baseTitle.current}` : baseTitle.current;
    return () => {
      if (baseTitle.current) document.title = baseTitle.current;
    };
  }, [pending.length]);

  useEffect(() => {
    if (!pushSupported()) setPushState("unsupported");
  }, []);

  async function enableAdminNotify() {
    setPushState("asking");
    const result = await subscribeToPush("admin");
    if (result === "subscribed") {
      setPushState("on");
      toast("You'll be notified here when a new transfer comes in.");
    } else if (result === "denied") {
      setPushState("denied");
    } else {
      setPushState("unsupported");
    }
  }

  async function saveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      bank: fd.get("bank"),
      accountNumber: fd.get("accountNumber"),
      accountName: fd.get("accountName"),
    };
    setSavingAccount(true);
    const res = await fetch("/api/admin/payment-account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingAccount(false);
    if (res.ok) {
      toast("Payment account updated.");
      loadAccount();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not save.");
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passcode }),
    });
    if (res.ok) {
      setAuthed(true);
      loadSales();
    } else {
      toast("Wrong passcode.");
    }
  }

  async function addMatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      title: fd.get("title"),
      subtitle: fd.get("subtitle"),
      competition: fd.get("competition"),
      kickoffAt: fd.get("kickoff") ? new Date(String(fd.get("kickoff"))).toISOString() : null,
      tier: Number(fd.get("tier")),
      pick: fd.get("pick"),
    };
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast("Match added.");
      form.reset();
      loadMatches();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not add match.");
    }
  }

  async function toggleFeatured(m: ApiMatch) {
    if (!m.featured && m.tier === 4) {
      toast("Correct Score can't be the free pick.");
      return;
    }
    const res = await fetch(`/api/matches/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !m.featured }),
    });
    if (res.ok) loadMatches();
  }

  async function settle(id: string, result: "win" | "loss") {
    await fetch(`/api/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settled: true, result }),
    });
    loadMatches();
    loadSales();
  }

  async function reopen(id: string) {
    await fetch(`/api/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settled: false }),
    });
    loadMatches();
  }

  async function decide(id: string, action: "confirm" | "reject") {
    const res = await fetch(`/api/admin/unlocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast(action === "confirm" ? "Transfer confirmed — pick unlocked." : "Request rejected.");
      loadPending();
      loadSales();
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setPasscode("");
  }

  if (authed === null) {
    return (
      <main className="shell">
        <div className="empty">Loading…</div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="shell">
        <div className="gate">
          <h2 className="section-title">Admin access</h2>
          <p>
            This area creates matches, sets picks, features the free spotlight, confirms bank
            transfers, and settles results. Ask the platform owner for the passcode.
          </p>
          <form onSubmit={login}>
            <input
              type="password"
              placeholder="Passcode"
              autoComplete="off"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <button className="btn" type="submit">
              Enter
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="admin-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Admin
        </h2>
        <button className="btn ghost" onClick={logout}>
          Log out
        </button>
      </div>
      <div className="banner">
        {account ? (
          <>
            Payment is manual: buyers transfer to{" "}
            <strong className="mono">{account.accountNumber}</strong> ({account.bank},{" "}
            {account.accountName}) and submit the phone number they sent it from. Check that
            account for a matching transfer, then confirm or reject each request below —
            confirming is what unlocks the pick for that number.
          </>
        ) : (
          "Loading payment account…"
        )}
      </div>

      <div className="admin-block">
        <h2 className="section-title">Payment account</h2>
        <p className="section-sub">
          Where buyers send bank transfers, and what shows on the checkout screen. Changing this
          only affects new requests — it doesn&rsquo;t relabel transfers already sent.
        </p>
        {account && (
          <form className="form-grid" onSubmit={saveAccount}>
            <div className="field">
              <label>Bank</label>
              <input name="bank" type="text" defaultValue={account.bank} required />
            </div>
            <div className="field">
              <label>Account number</label>
              <input
                name="accountNumber"
                type="text"
                inputMode="numeric"
                defaultValue={account.accountNumber}
                required
              />
            </div>
            <div className="field full">
              <label>Account name</label>
              <input name="accountName" type="text" defaultValue={account.accountName} required />
            </div>
            <div className="full">
              <button className="btn" type="submit" disabled={savingAccount}>
                {savingAccount ? "Saving…" : "Save account details"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="admin-block">
        <h2 className="section-title">
          Pending transfers
          {pending.length > 0 && <span className="pending-dot" aria-hidden="true" />}
        </h2>
        <p className="section-sub">
          {pending.length === 0
            ? "Nothing waiting on you right now."
            : `${pending.length} request${pending.length === 1 ? "" : "s"} waiting on confirmation.`}
        </p>
        {pushState !== "on" && pushState !== "unsupported" && (
          <div className="banner banner-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <span>Get pinged here the moment a new transfer request comes in, even in another tab.</span>
            <button className="btn small" onClick={enableAdminNotify} disabled={pushState === "asking"}>
              {pushState === "asking" ? "Asking…" : pushState === "denied" ? "Blocked — check browser settings" : "Notify me"}
            </button>
          </div>
        )}
        <div className="table-wrap">
          <table className="stack">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Fixture</th>
                <th>Tier</th>
                <th className="mono">Amount</th>
                <th>Phone</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--ink-soft)" }}>
                    No pending transfers.
                  </td>
                </tr>
              ) : (
                pending.map((p) => (
                  <tr key={p.id}>
                    <td className="mono" data-label="Requested">{relTime(p.requestedAt)}</td>
                    <td data-label="Fixture">
                      <div className="fixture-cell">
                        <span className="t">{p.matchTitle}</span>
                        <span className="s">{p.competition}</span>
                      </div>
                    </td>
                    <td data-label="Tier">Tier {tierInfo(p.tier).code}</td>
                    <td className="mono" data-label="Amount">{naira(p.amount)}</td>
                    <td className="mono" data-label="Phone">{p.phone}</td>
                    <td data-label="Decision">
                      <span className="actions-cell">
                        <button className="btn small" onClick={() => decide(p.id, "confirm")}>
                          Confirm
                        </button>
                        <button
                          className="btn ghost small"
                          onClick={() => decide(p.id, "reject")}
                        >
                          Reject
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-block">
        <h2 className="section-title">Sales</h2>
        {sales && (
          <>
            <div className="dash-stats">
              <div className="dash-tile">
                <span className="k">Revenue</span>
                <span className="v mono">{naira(sales.totalRevenue)}</span>
              </div>
              <div className="dash-tile">
                <span className="k">Purchases</span>
                <span className="v mono">{sales.totalPurchases}</span>
              </div>
              <div className="dash-tile">
                <span className="k">Tier IV sold</span>
                <span className="v mono">{sales.byTier[4] ?? 0}</span>
              </div>
              <div className="dash-tile">
                <span className="k">Tier I sold</span>
                <span className="v mono">{sales.byTier[1] ?? 0}</span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="stack">
                <thead>
                  <tr>
                    <th>Confirmed</th>
                    <th>Fixture</th>
                    <th>Tier</th>
                    <th className="mono">Amount</th>
                    <th>Buyer</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ color: "var(--ink-soft)" }}>
                        No confirmed transfers yet.
                      </td>
                    </tr>
                  ) : (
                    sales.recent.map((u) => (
                      <tr key={u.id}>
                        <td className="mono" data-label="Confirmed">{relTime(u.paidAt)}</td>
                        <td data-label="Fixture">{u.matchTitle}</td>
                        <td data-label="Tier">Tier {tierInfo(u.tier).code}</td>
                        <td className="mono" data-label="Amount">{naira(u.amount)}</td>
                        <td className="mono" data-label="Buyer">{u.phone}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="admin-block">
        <h2 className="section-title">Add a match</h2>
        <form className="form-grid" onSubmit={addMatch}>
          <div className="field">
            <label>Fixture / title</label>
            <input name="title" type="text" placeholder="Rivers United vs Enyimba" required />
          </div>
          <div className="field">
            <label>Subtitle (optional)</label>
            <input name="subtitle" type="text" placeholder="e.g. legs, note" />
          </div>
          <div className="field">
            <label>Competition</label>
            <input name="competition" type="text" placeholder="NPFL" required />
          </div>
          <div className="field">
            <label>Kickoff</label>
            <input name="kickoff" type="datetime-local" required />
          </div>
          <div className="field">
            <label>Tier</label>
            <select name="tier" defaultValue="1">
              {([1, 2, 3, 4] as const).map((tn) => (
                <option key={tn} value={tn}>
                  Tier {TIERS[tn].code} — {TIERS[tn].name} ({naira(TIERS[tn].price)})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Pick</label>
            <input name="pick" type="text" placeholder="Home win / Over 2.5 / 2-1" required />
          </div>
          <div className="full">
            <button className="btn" type="submit">
              Add match
            </button>
          </div>
        </form>
      </div>

      <div className="admin-block">
        <h2 className="section-title">Manage matches</h2>
        <p className="section-sub">
          The free spotlight switch below is how you set today&rsquo;s free pick — flip it on for
          one match and it appears unlocked for everyone on Home and Predictions, no payment
          required. It&rsquo;s blocked on Tier IV on purpose.
        </p>
        <div className="table-wrap">
          <table className="stack">
            <thead>
              <tr>
                <th>Fixture</th>
                <th>Tier</th>
                <th>Kickoff</th>
                <th className="mono">Pick</th>
                <th>Free spotlight</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--ink-soft)" }}>
                    No matches yet — add one above.
                  </td>
                </tr>
              ) : (
                matches
                  .slice()
                  .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
                  .map((m) => (
                    <tr key={m.id}>
                      <td data-label="Fixture">
                        <div className="fixture-cell">
                          <span className="t">{m.title}</span>
                          <span className="s">{m.competition}</span>
                        </div>
                        <button className="btn ghost small" style={{ marginTop: 6 }} onClick={() => setEditingMatch(m)}>
                          Edit
                        </button>
                      </td>
                      <td data-label="Tier">Tier {tierInfo(m.tier).code}</td>
                      <td className="mono" data-label="Kickoff">{fmtKickoff(m.kickoffAt)}</td>
                      <td className="mono" data-label="Pick">{m.pick}</td>
                      <td data-label="Free spotlight">
                        <button
                          className={"switch" + (m.featured ? " on" : "")}
                          disabled={!m.featured && m.tier === 4}
                          title={m.tier === 4 ? "Correct Score can't be the free pick" : undefined}
                          onClick={() => toggleFeatured(m)}
                        />
                      </td>
                      <td data-label="Result">
                        {m.settled ? (
                          <span className="actions-cell">
                            <span className={"badge " + (m.result === "win" ? "win" : "loss")}>
                              {m.result === "win" ? "WON" : "LOST"}
                            </span>
                            <button className="btn ghost small" onClick={() => reopen(m.id)}>
                              Reopen
                            </button>
                          </span>
                        ) : (
                          <span className="actions-cell">
                            <button className="btn small" onClick={() => settle(m.id, "win")}>
                              Mark won
                            </button>
                            <button
                              className="btn small danger"
                              onClick={() => settle(m.id, "loss")}
                            >
                              Mark lost
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingMatch && (
        <EditMatchModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={loadMatches}
        />
      )}
    </main>
  );
}
