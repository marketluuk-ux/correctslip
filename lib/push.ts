import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      "mailto:owner@correctslip.local",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
  configured = true;
}

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

type PushPayload = { title: string; body: string; url?: string };

async function sendToRow(
  row: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    // 404/410 means the browser revoked or expired this subscription — clean it up.
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: row.id } }).catch(() => {});
    }
  }
}

export async function notifyBuyer(phone: string, payload: PushPayload) {
  if (!pushConfigured()) return;
  const rows = await prisma.pushSubscription.findMany({ where: { role: "buyer", phone } });
  await Promise.all(rows.map((r) => sendToRow(r, payload)));
}

export async function notifyAdmins(payload: PushPayload) {
  if (!pushConfigured()) return;
  const rows = await prisma.pushSubscription.findMany({ where: { role: "admin" } });
  await Promise.all(rows.map((r) => sendToRow(r, payload)));
}

// Anonymous opt-in list — anyone who asked to hear about the daily free
// pick, whether or not they've ever bought anything.
export async function notifyDailySubscribers(payload: PushPayload) {
  if (!pushConfigured()) return;
  const rows = await prisma.pushSubscription.findMany({ where: { role: "daily" } });
  await Promise.all(rows.map((r) => sendToRow(r, payload)));
}
