import { prisma } from "@/lib/prisma";
import { TIERS } from "@/lib/tiers";

const SETTING_KEY = "tier_prices";

export type TierPrices = { 1: number; 2: number; 3: number; 4: number };

function defaultPrices(): TierPrices {
  return { 1: TIERS[1].price, 2: TIERS[2].price, 3: TIERS[3].price, 4: TIERS[4].price };
}

// The authoritative prices — checkout charges whatever this returns, not
// the hardcoded defaults in lib/tiers.ts (those are only the one-time seed
// value, same pattern as the bank transfer account).
export async function getTierPrices(): Promise<TierPrices> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return defaultPrices();
  try {
    const parsed = JSON.parse(row.value);
    const fallback = defaultPrices();
    const clean = (v: unknown, tier: 1 | 2 | 3 | 4) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback[tier];
    };
    return {
      1: clean(parsed[1], 1),
      2: clean(parsed[2], 2),
      3: clean(parsed[3], 3),
      4: clean(parsed[4], 4),
    };
  } catch {
    return defaultPrices();
  }
}

export async function setTierPrices(prices: TierPrices) {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(prices) },
    create: { key: SETTING_KEY, value: JSON.stringify(prices) },
  });
}
