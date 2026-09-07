"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/Toaster";

export default function PhoneGate({
  prompt,
  onChange,
}: {
  prompt: string;
  onChange: (phone: string | null) => void;
}) {
  const [me, setMe] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [checking, setChecking] = useState(false);

  const loadMe = useCallback(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.phone);
        onChange(d.phone);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  async function checkNumber(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneInput }),
    });
    setChecking(false);
    if (res.ok) {
      setPhoneInput("");
      loadMe();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Couldn't check that number.");
    }
  }

  async function switchNumber() {
    await fetch("/api/me", { method: "DELETE" });
    setMe(null);
    setExpanded(false);
    onChange(null);
  }

  // Identified buyers always get the full banner — it's the whole point of
  // their visit. Everyone else gets a quiet, low-weight link by default, so
  // a first-time browser isn't opened with a post-purchase prompt before
  // they've even seen what's for sale.
  if (me) {
    return (
      <div className="banner banner-row" style={{ justifyContent: "space-between" }}>
        <span>
          Showing picks confirmed for <strong className="mono">{me}</strong>.
        </span>
        <button className="btn ghost small" onClick={switchNumber}>
          Not you? Use a different number
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button className="phone-gate-link" onClick={() => setExpanded(true)}>
        Already sent a transfer? Check your number →
      </button>
    );
  }

  return (
    <form className="banner banner-row" onSubmit={checkNumber}>
      <span>{prompt}</span>
      <input
        type="tel"
        placeholder="080XXXXXXXX"
        value={phoneInput}
        onChange={(e) => setPhoneInput(e.target.value)}
        className="phone-check-input"
        autoFocus
      />
      <button className="btn small" type="submit" disabled={checking}>
        {checking ? "Checking…" : "Check"}
      </button>
    </form>
  );
}
