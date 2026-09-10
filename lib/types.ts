export type ApiMatch = {
  id: string;
  title: string;
  subtitle?: string | null;
  competition: string;
  kickoffAt: string;
  tier: number;
  featured: boolean;
  settled: boolean;
  result: "win" | "loss" | null;
  unlocked: boolean;
  pick?: string;
};

export type SalesData = {
  totalRevenue: number;
  totalPurchases: number;
  byTier: Record<number, number>;
  recent: {
    id: string;
    matchId: string;
    matchTitle: string;
    tier: number;
    amount: number;
    phone: string;
    paidAt: string;
  }[];
};

export type PendingUnlock = {
  id: string;
  matchId: string;
  matchTitle: string;
  competition: string;
  phone: string;
  tier: number;
  amount: number;
  requestedAt: string;
};

export type ReferralsData = {
  granted: number;
  spent: number;
  outstanding: number;
  recent: {
    id: string;
    phone: string;
    amount: number;
    reason: string;
    createdAt: string;
  }[];
};
