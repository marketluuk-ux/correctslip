export const TIERS = {
  1: { code: "I", name: "Single", price: 500 },
  2: { code: "II", name: "Accumulator", price: 2000 },
  3: { code: "III", name: "Banker", price: 5000 },
  4: { code: "IV", name: "Correct Score", price: 10000 },
} as const;

export type TierNumber = keyof typeof TIERS;

export function tierInfo(tier: number) {
  return TIERS[tier as TierNumber] ?? TIERS[1];
}

export function naira(amount: number) {
  return "₦" + amount.toLocaleString("en-NG");
}
