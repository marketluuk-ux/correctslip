"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiMatch, SalesData, PendingUnlock, ReferralsData } from "@/lib/types";
import { TIERS, tierInfo, naira } from "@/lib/tiers";
import { fmtKickoff, relTime } from "@/lib/format";
import { BankTransferAccount } from "@/lib/payment";
import { subscribeToPush, pushSupported } from "@/lib/clientPush";
import { toast } from "@/components/Toaster";
import EditMatchModal from "@/components/EditMatchModal";
import PendingTransferCard from "@/components/PendingTransferCard";
import type { TierPricesMap } from "@/lib/useTierPrices";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [editingMatch, setEditingMatch] = useState<ApiMatch | null>(null);
  const [sales, setSales] = useState<SalesData | null>(null);
  const [pending, setPending] = useState<PendingUnlock[]>([]);
  const [referrals, setReferrals] = useState<ReferralsData | null>(null);
  const [account, setAccount] = useState<BankTransferAccount | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [tierPrices, setTierPrices] = useState<TierPricesMap | null>(null);
  const [savingPrices, setSavingPrices] = useState(false);
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

  const loadTierPrices = useCallback(() => {
    fetch("/api/admin/tier-prices")
      .then((r) => r.json())
      .then(setTierPrices);
  }, []);

  const loadReferrals = useCallback(() => {
    fetch("/api/admin/referrals")
      .then((r) => r.json())
      .then(setReferrals);
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
      loadTierPrices();
      loadReferrals();
    }
  }, [authed, loadMatches, loadPending, loadAccount, loadTierPrices, loadReferrals]);

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

  async function saveTierPrices(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      1: fd.get("price1"),
      2: fd.get("price2"),
      3: fd.get("price3"),
      4: fd.get("price4"),
    };
    setSavingPrices(true);
    const res = await fetch("/api/admin/tier-prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingPrices(false);
    if (res.ok) {
      toast("Tier prices updated.");
      loadTierPrices();
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
      loadReferrals();
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
      {/* Sales first — the realized proof this works. Everything else on
          this page exists to produce or protect this number. */}
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

      {/* Referral credits — the growth loop working, or not yet. ₦500 to
          both sides on a referred buyer's first confirmed purchase. */}
      <div className="admin-block">
        <h2 className="section-title">Referral credits</h2>
        <p className="section-sub">
          Every buyer can share a link that credits both people ₦500 when their friend&rsquo;s
          first pick is confirmed. This is that ledger — nothing here needs action from you, it
          runs on its own from the confirm button above.
        </p>
        {referrals && (
          <>
            <div className="dash-stats">
              <div className="dash-tile">
                <span className="k">Given out</span>
                <span className="v mono">{naira(referrals.granted)}</span>
              </div>
              <div className="dash-tile">
                <span className="k">Redeemed</span>
                <span className="v mono">{naira(referrals.spent)}</span>
              </div>
              <div className="dash-tile">
                <span className="k">Still outstanding</span>
                <span className="v mono">{naira(referrals.outstanding)}</span>
              </div>
            </div>
            {referrals.recent.length > 0 && (
              <div className="table-wrap">
                <table className="stack">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Phone</th>
                      <th className="mono">Amount</th>
                      <th>Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.recent.map((r) => (
                      <tr key={r.id}>
                        <td className="mono" data-label="When">{relTime(r.createdAt)}</td>
                        <td className="mono" data-label="Phone">{r.phone}</td>
                        <td className="mono" data-label="Amount">
                          {r.amount > 0 ? "+" : ""}
                          {naira(r.amount)}
                        </td>
                        <td data-label="Why">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pending transfers second — the one action that turns the next
          buyer's intent into the next row in Sales above. */}
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
        {account && (
          <p className="section-sub" style={{ marginTop: -14 }}>
            Checking against <strong className="mono">{account.accountNumber}</strong> —{" "}
            {account.bank}, {account.accountName}.
          </p>
        )}
        {pushState !== "on" && pushState !== "unsupported" && (
          <div className="banner banner-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <span>Get pinged here the moment a new transfer request comes in, even in another tab.</span>
            <button className="btn small" onClick={enableAdminNotify} disabled={pushState === "asking"}>
              {pushState === "asking" ? "Asking…" : pushState === "denied" ? "Blocked — check browser settings" : "Notify me"}
            </button>
          </div>
        )}
        {pending.length === 0 ? (
          <div className="empty">Nothing waiting. New requests show up here.</div>
        ) : (
          pending.map((p) => <PendingTransferCard key={p.id} item={p} onDecide={decide} />)
        )}
      </div>

      {/* Manage matches third — the daily operational work (settle,
          feature, edit) that keeps Pending transfers and Sales fed. */}
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
                    No matches yet — add one below.
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
                              Undo this result
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

      {/* Add a match fourth — extending the inventory, lower frequency
          than managing what's already live. */}
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
                  Tier {TIERS[tn].code} — {TIERS[tn].name} ({naira(tierPrices?.[tn] ?? TIERS[tn].price)})
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

      {/* Tier pricing — also static config, touched about as rarely as the
          payment account. */}
      <div className="admin-block">
        <h2 className="section-title">Tier pricing</h2>
        <p className="section-sub">
          What each tier costs to unlock. Changing this only affects new purchases — sales
          already confirmed keep the amount that was actually charged.
        </p>
        {tierPrices && (
          <form className="form-grid" onSubmit={saveTierPrices}>
            {([1, 2, 3, 4] as const).map((tn) => (
              <div className="field" key={tn}>
                <label>
                  Tier {TIERS[tn].code} — {TIERS[tn].name}
                </label>
                <input
                  name={`price${tn}`}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  defaultValue={tierPrices[tn]}
                  required
                />
              </div>
            ))}
            <div className="full">
              <button className="btn" type="submit" disabled={savingPrices}>
                {savingPrices ? "Saving…" : "Save prices"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Payment account last — static configuration, set once and
          almost never revisited. Least value per pixel, so it gets the
          least prominent position. */}
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
