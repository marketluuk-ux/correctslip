"use client";

import type { CSSProperties } from "react";

export default function ShareButton({
  text,
  url,
  label,
  className,
  style,
}: {
  text: string;
  url: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text, url });
      } catch {
        // Cancelled or unsupported mid-call — fall through silently.
      }
      return;
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" className={className ?? "btn ghost small"} style={style} onClick={share}>
      {label ?? "Share"}
    </button>
  );
}
