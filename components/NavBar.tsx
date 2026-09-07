"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Admin is deliberately not listed here — it's reachable at /admin directly
// (still passcode-gated server-side), just not advertised in public nav.
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/predictions", label: "Predictions" },
  { href: "/my-picks", label: "My Picks" },
  { href: "/track-record", label: "Track Record" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the menu whenever navigation actually happens.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="mark" />
          <span className="name">CorrectSlip</span>
        </div>

        <nav className="tabs tabs-desktop">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={"tab" + (pathname === l.href ? " active" : "")}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          className={"hamburger" + (open ? " open" : "")}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <nav className="mobile-nav" id="mobile-nav">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={"mobile-nav-link" + (pathname === l.href ? " active" : "")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
