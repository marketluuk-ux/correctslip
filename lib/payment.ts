import { prisma } from "@/lib/prisma";

export type BankTransferAccount = {
  bank: string;
  accountNumber: string;
  accountName: string;
};

// Seeded into Settings on first run; editable by the admin from then on
// (see /api/admin/payment-account) — this constant only matters once.
export const DEFAULT_BANK_TRANSFER_ACCOUNT: BankTransferAccount = {
  bank: "Opay",
  accountNumber: "9032598925",
  accountName: "Chinenye Kingsley Utoanu",
};

const SETTING_KEY = "bank_transfer_account";

export async function getBankTransferAccount(): Promise<BankTransferAccount> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return DEFAULT_BANK_TRANSFER_ACCOUNT;
  try {
    const parsed = JSON.parse(row.value);
    if (parsed && parsed.bank && parsed.accountNumber && parsed.accountName) return parsed;
  } catch {}
  return DEFAULT_BANK_TRANSFER_ACCOUNT;
}

export async function setBankTransferAccount(account: BankTransferAccount) {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(account) },
    create: { key: SETTING_KEY, value: JSON.stringify(account) },
  });
}
