"use client";

import { useEffect, useState } from "react";
import { ApiMatch } from "@/lib/types";
import { tierInfo, naira } from "@/lib/tiers";
import { fmtKickoff } from "@/lib/format";
import { BankTransferAccount } from "@/lib/payment";
import { subscribeToPush, pushSupported } from "@/lib/clientPush";
import { useTierPrices } from "@/lib/useTierPrices";
import { toast } from "@/components/Toaster";

export default function CheckoutModal({
  match,
  onClose,
  onUnlocked,
}: {
  match: ApiMatch;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const t = tierInfo(match.tier);
  const prices = useTierPrices();
  const price = prices[match.tier as 1 | 2 | 3 | 4];
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem("sv_last_phone") ?? "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [account, setAccount] = useState<BankTransferAccount | null>(null);
  const [pushState, setPushState] = useState<"idle" | "asking" | "on" | "denied" | "unsupported">("idle");
  const [copiedField, setCopiedField] = useState<"amount" | "account" | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    fetch("/api/payment-account")
      .then((r) => r.json())
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  async function copyValue(text: string, field: "amount" | "account") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1600);
    } catch {
      toast("Couldn't copy — select and copy it manually.");
    }
  }

  async function submit() {
    if (!phone.trim()) {
      setError("Enter the phone number you're sending the transfer from.");
      return;
    }
    if (!acknowledged) {
      setError("Please confirm you understand before sending.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem("sv_last_phone", phone.trim());
      } catch {}
      if (data.alreadyUnlocked) {
        toast("Already confirmed — unlocked.");
        onUnlocked();
        onClose();
        return;
      }
      setSent(true);
      onUnlocked();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function enableNotify() {
    setPushState("asking");
    const result = await subscribeToPush("buyer");
    if (result === "subscribed") {
      setPushState("on");
      toast("You'll be notified the moment it's confirmed.");
    } else if (result === "denied") {
      setPushState("denied");
    } else {
      setPushState("unsupported");
    }
  }

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>{match.title}</h3>
        <div className="m-sub">
          {match.competition} · {fmtKickoff(match.kickoffAt)}
        </div>
        <div className="m-price mono">{naira(price)}</div>

        {sent ? (
          <>
            <div className="m-note" style={{ background: "var(--paper-raised)" }}>
              This one&rsquo;s already yours in principle — <strong className="mono">{phone}</strong>{" "}
              just needs an admin to see the transfer land, usually within a few hours. Track it
              anytime on My Picks.
            </div>
            {pushSupported() && pushState !== "on" && (
              <button className="btn ghost" style={{ width: "100%", marginBottom: 10 }} onClick={enableNotify} disabled={pushState === "asking"}>
                {pushState === "asking"
                  ? "Asking…"
                  : pushState === "denied"
                    ? "Notifications blocked — check browser settings"
                    : "Notify me when it's confirmed"}
              </button>
            )}
            <div className="m-actions">
              <button className="btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="m-note">
              {account ? (
                <>
                  <div style={{ marginBottom: 10 }}>Send this by bank transfer:</div>
                  <div className="copy-row">
                    <div>
                      <div className="copy-label">Amount</div>
                      <div className="mono copy-value">{naira(price)}</div>
                    </div>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => copyValue(String(price), "amount")}
                    >
                      {copiedField === "amount" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="copy-row">
                    <div>
                      <div className="copy-label">Account number — {account.bank}</div>
                      <div className="mono copy-value">{account.accountNumber}</div>
                    </div>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => copyValue(account.accountNumber, "account")}
                    >
                      {copiedField === "account" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div style={{ marginTop: 8 }}>{account.accountName}</div>
                  <div style={{ marginTop: 10 }}>
                    Then enter the number you sent it from below. An admin confirms every transfer
                    by hand — this pick unlocks for that number once they do.
                  </div>
                </>
              ) : (
                "Loading transfer details…"
              )}
            </div>
            <div className="field">
              <label>Your phone number</label>
              <input
                type="tel"
                placeholder="080XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="odds-note">
              Every pick here — including this one — has real odds of missing. That&rsquo;s not
              fine print, it&rsquo;s on the homepage: the price buys the work, not the outcome. We
              publish every result, win or lose, on Track Record, so you never have to take our
              word for it. Transfers aren&rsquo;t refunded if this one doesn&rsquo;t land.
            </div>
            <label className="ack-row">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={busy}
              />
              <span>I understand this pick may not win, and that this transfer isn&rsquo;t refunded either way.</span>
            </label>

            {error && (
              <div style={{ color: "var(--vault)", fontSize: 12.5, marginTop: 8 }}>{error}</div>
            )}
            <div className="m-actions">
              <button className="btn ghost" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button className="btn" onClick={submit} disabled={busy || !account || !acknowledged}>
                {busy ? "Sending…" : "I've sent the transfer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
