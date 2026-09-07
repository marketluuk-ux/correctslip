import { NextResponse } from "next/server";
import { getBankTransferAccount } from "@/lib/payment";

// Public: the checkout modal needs this to show buyers where to send money.
export async function GET() {
  const account = await getBankTransferAccount();
  return NextResponse.json(account);
}
