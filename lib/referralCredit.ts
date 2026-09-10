import { prisma } from "@/lib/prisma";

export const REFERRAL_REWARD = 500; // naira — exactly Tier I's price, on purpose

export async function getCreditBalance(phone: string): Promise<number> {
  const rows = await prisma.referralCredit.findMany({
    where: { phone },
    select: { amount: true },
  });
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

export async function grantCredit(phone: string, amount: number, reason: string) {
  await prisma.referralCredit.create({ data: { phone, amount, reason } });
}

// Atomic check-and-spend inside one transaction, so two concurrent requests
// can never both succeed against the same ₦500 — the second one recomputes
// the balance inside the transaction and correctly sees it's already gone.
export async function trySpendCredit(
  phone: string,
  cost: number,
  reason: string
): Promise<boolean> {
  if (cost <= 0) return false;
  return prisma.$transaction(async (tx) => {
    const rows = await tx.referralCredit.findMany({
      where: { phone },
      select: { amount: true },
    });
    const balance = rows.reduce((sum, r) => sum + r.amount, 0);
    if (balance < cost) return false;
    await tx.referralCredit.create({ data: { phone, amount: -cost, reason } });
    return true;
  });
}
