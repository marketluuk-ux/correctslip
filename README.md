# CorrectSlip

A four-tier football prediction platform priced in naira: Tier I Single (₦500), Tier II
Accumulator (₦2,000), Tier III Banker (₦5,000), Tier IV Correct Score (₦10,000). Each match
card shows the fixture and price but withholds the pick until it's paid for (or featured as
the free daily spotlight) — enforced server-side, not just hidden with CSS.

## Stack

Next.js 16 (App Router, TypeScript) · Prisma 5 + Postgres · manual bank-transfer payment (no
payment gateway) · hand-written CSS, no UI framework.

## Run it locally

Needs a real Postgres database — `DATABASE_URL` in `.env` has to point at one (a free
[Neon](https://neon.tech)/[Supabase](https://supabase.com) project, Docker, or the same Render
database this project deploys to — see below). The schema is kept in sync with `prisma db push`
rather than migration files (see **Deploying to Render**, below, for why).

```bash
npm install
npx prisma db push     # creates the tables
npx prisma db seed     # loads 8 sample fixtures (safe to re-run — skips if data exists)
npm run dev
```

Open http://localhost:3000. Admin passcode is set in `.env` (`ADMIN_PASSWORD`, defaults to
`CORRECT2026` — change it before deploying).

## How the unlock actually works

- `GET /api/matches` returns every fixture, but only includes the `pick` field when the match
  is `featured`, already `settled` (history is public — see below), the requesting admin
  session is valid, or this visitor's phone number has a `paid` `Unlock` row for it. A visitor
  inspecting network traffic on a locked card genuinely cannot see the pick — that's the fix
  over a CSS-only blur, which would leak the value in the DOM.
- Identity is the buyer's own phone number, not an anonymous device id. It's set in an
  `httpOnly` cookie (`sv_phone`) either when they submit a transfer request or when they type
  it into the "Already sent a transfer?" box on Predictions — so a confirmed unlock follows the
  phone number across devices and browsers, not just the one that paid.
- Settled matches always include the pick, regardless of payment — they're the track record,
  and withholding history would defeat its purpose as proof.

## Payment: manual bank transfer

There is no payment gateway. The receiving account lives in the `Setting` table, not in code —
edit it anytime under **Admin → Payment account**. `lib/payment.ts` only holds
`DEFAULT_BANK_TRANSFER_ACCOUNT`, the one-time seed value used if that setting has never been
saved; after the first edit it's ignored. Double-check whatever's saved there against the real
Opay account before taking money — a typo sends buyers' transfers somewhere unrecoverable.

Flow:

1. Buyer clicks "Unlock" → `CheckoutModal` shows the account details and asks for the phone
   number they're transferring from.
2. `POST /api/checkout/init` records a `pending` `Unlock` for that `(matchId, phone)` pair and
   sets the `sv_phone` cookie. No money has moved yet as far as the app knows.
3. The admin checks the Opay account by hand, matches a transfer to a phone number in
   **Admin → Pending transfers**, and clicks **Confirm** (or **Reject** if nothing matches).
   `PATCH /api/admin/unlocks/[id]` is the only thing that flips a request to `paid` — that's
   the single point where a pick actually unlocks.
4. Anyone — same browser or not — who submits that exact phone number again (via the
   Predictions page's "Already sent a transfer?" box, hitting `POST /api/me`) sees it revealed.

This is intentionally manual end-to-end. There's no way for the app to verify a transfer landed
— that trust boundary is the admin looking at the actual Opay account, which is also the
platform's main scaling limit: one person confirming transfers by hand.

## Admin

`/admin`, gated by a single shared passcode (`ADMIN_PASSWORD`) — good enough for one operator,
not for multiple admins with different permissions. From there:

- **Pending transfers** — the confirm/reject queue described above.
- **Sales** — confirmed transfers only, with revenue and per-tier counts.
- **Add a match**, and **Manage matches** — the free-spotlight toggle here is how you set the
  daily free pick (flip it on for one match; blocked on Tier IV on purpose — giving away the
  hardest, highest-priced market for free undercuts the reason it's priced high), and settling
  results as won/lost is what populates Track Record and the win-rate stat on the homepage.

## Keeping people coming back

- **The free spotlight rotates itself.** `lib/dailyPick.ts` (`ensureDailyFeaturedPick`) picks a
  new Tier I–III match whenever the current one has kicked off, settled, or been featured for
  20+ hours — never-before-featured matches are preferred, so it doesn't repeat while there's a
  fresh option. This runs automatically: `instrumentation.ts` calls it once at server boot and
  every hour after, for as long as this stays a persistent Node process. If it ever moves to a
  serverless host, that `setInterval` won't survive between invocations — point an external
  scheduler (Vercel Cron, cron-job.org) at `POST /api/cron/rotate-pick` instead (optionally
  gated by `CRON_SECRET`). The admin's manual featured-toggle still works and takes priority
  until it goes stale by the same rule.
- **Real push notifications**, no third-party account (a local Web Push/VAPID keypair, see
  `.env`):
  - Anyone — buyer or not — can tap "Notify me when a new free pick drops" on the homepage.
    That's the `role: "daily"` subscription in `PushSubscription`, anonymous, no phone required.
    It fires from inside `ensureDailyFeaturedPick` itself, so a rotation always broadcasts.
  - A buyer who's just submitted a transfer can opt into "Notify me when it's confirmed" —
    fires the moment an admin confirms it (`lib/push.ts`'s `notifyBuyer`).
  - The admin can opt into "Notify me of new transfers" — fires on every new pending request.
  - iOS Safari only delivers these if the site's been added to the home screen first (an Apple
    platform limit); Chrome/Android and desktop get it directly in-browser.
- **A lightweight streak** (`lib/streak.ts`) — per-browser, `localStorage`-only, not
  server-verified. It's a habit nudge, not a reward mechanism, so it doesn't need to be
  tamper-proof: nothing of value is gated behind it.
- **Not yet built**: a pre-kickoff reminder for someone who viewed a locked pick but didn't buy.
  That needs view-tracking infrastructure (who saw which match) that doesn't exist yet — it's
  the next-highest-leverage retention piece if this list gets revisited.

## Deploying to Render

`render.yaml` is a Blueprint — it defines the web service *and* a free Postgres database
together, so Render provisions both and wires `DATABASE_URL` automatically. Nothing here is
optional infrastructure: without it the SQLite version of this app would lose every match, sale,
and pending transfer on the first deploy, since Render's web services don't keep local files
between deploys.

1. Push this repo to GitHub (see the top-level steps you were given alongside this file).
2. On [render.com](https://render.com), **New +** → **Blueprint**, connect your GitHub account,
   and pick this repo. Render reads `render.yaml` and shows you a web service named
   `correctslip` plus a database named `correctslip-db`.
3. It'll prompt you for the env vars marked `sync: false` in `render.yaml` — paste these in:
   - `ADMIN_PASSWORD` — pick your own; this is the `/admin` passcode.
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — reuse the values
     already in your local `.env`, or generate a fresh pair with
     `node -e "console.log(require('web-push').generateVAPIDKeys())"` (either is fine on a
     first deploy — there are no push subscriptions yet to invalidate).
   - `SESSION_SECRET` and `CRON_SECRET` are auto-generated by Render — no action needed.
4. Click **Apply**. First build takes a few minutes — it installs, generates the Prisma client,
   pushes the schema to the fresh Postgres database, seeds it, then builds the app.
5. The service name field is what becomes the subdomain — it must be exactly `correctslip` for
   the URL to land on `correctslip.onrender.com`. That name is shared across every Render user
   globally (this project already lost both `scorevault` and `sureslip` to other people before
   landing here), so double-check it's still free before you commit; if not, pick another name
   and update `NEXT_PUBLIC_BASE_URL` in `render.yaml` to match before deploying.

Two things about Render's free tier worth knowing going in, not discovering later:

- **Free web services sleep after 15 minutes idle** and take ~30–50s to wake on the next
  request — the first visitor after a quiet spell will see a slow load, not a broken site.
- **Free Postgres databases expire** after a limited window (Render's current terms, not this
  project's) unless upgraded to a paid plan before then — fine for testing this live, not
  something to build a real launch on without upgrading first.

`prisma db push --accept-data-loss` runs on every deploy — safe on an empty or additive schema
change, but it can silently drop a column/table if a future schema change removes one. Fine for
a solo project moving fast; worth switching to real `prisma migrate` history before this has
paying users and data worth protecting from a bad push.

## Before a real launch

- Confirm the account saved under **Admin → Payment account** character-for-character against
  the real Opay account — this project has already had the number corrected once mid-build,
  which is exactly the mistake the 10-digit validation on that form now catches.
- Replace the shared-passcode admin cookie with real per-admin auth if more than one person
  needs access.
- A phone number typed into a form isn't verified (no OTP) — anyone can claim any number. The
  real check is still the admin matching a transfer amount/name to what they see in Opay, not
  the phone number alone; the number is just the reveal key once they've matched it.
- Never claim a guaranteed outcome in match copy — Nigerian consumer-protection norms and
  common sense both care about this, and it's also just honest.
