import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { getBankTransferAccount, setBankTransferAccount } from "@/lib/payment";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  return NextResponse.json(await getBankTransferAccount());
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const bank = String(body.bank ?? "").trim();
  const accountNumber = String(body.accountNumber ?? "").trim();
  const accountName = String(body.accountName ?? "").trim();

  if (!bank || !accountNumber || !accountName) {
    return NextResponse.json({ error: "All three fields are required" }, { status: 400 });
  }
  if (!/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json(
      { error: "Account number should be 10 digits — double-check it before saving" },
      { status: 400 }
    );
  }

  await setBankTransferAccount({ bank, accountNumber, accountName });
  return NextResponse.json({ ok: true });
}
