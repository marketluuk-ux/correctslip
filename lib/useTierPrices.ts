"use client";

import { useEffect, useState } from "react";
import { TIERS } from "@/lib/tiers";

export type TierPricesMap = { 1: number; 2: number; 3: number; 4: number };

const DEFAULTS: TierPricesMap = { 1: TIERS[1].price, 2: TIERS[2].price, 3: TIERS[3].price, 4: TIERS[4].price };

// Renders the known-good defaults immediately (no flash of missing price),
// then swaps in the live, admin-set prices once fetched.
export function useTierPrices(): TierPricesMap {
  const [prices, setPrices] = useState<TierPricesMap>(DEFAULTS);
  useEffect(() => {
    fetch("/api/tier-prices")
      .then((r) => r.json())
      .then(setPrices)
      .catch(() => {});
  }, []);
  return prices;
}
