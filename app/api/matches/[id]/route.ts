import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> };

const EDITABLE_FIELDS = ["title", "subtitle", "competition", "kickoffAt", "tier", "pick"] as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  const current = await prisma.match.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const isEdit = EDITABLE_FIELDS.some((f) => body[f] !== undefined);
  if (isEdit) {
    // Track Record's whole point is that settled picks are unedited proof —
    // rewriting one after the fact would make that claim false. Reopening
    // first (a separate, visible action) is required before it can change.
    if (current.settled && body.settled !== false) {
      return NextResponse.json(
        { error: "This match is settled — reopen it first to make changes." },
        { status: 400 }
      );
    }

    const { title, subtitle, competition, kickoffAt, tier, pick } = body;
    if (!title || !competition || !kickoffAt || !pick || ![1, 2, 3, 4].includes(Number(tier))) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }
    data.title = String(title).trim();
    data.subtitle = subtitle ? String(subtitle).trim() : null;
    data.competition = String(competition).trim();
    data.kickoffAt = new Date(kickoffAt);
    data.tier = Number(tier);
    data.pick = String(pick).trim();

    // A match already featured can't be edited into Tier IV — same rule
    // the toggle enforces, just checked on the other trigger this time.
    if (data.tier === 4 && current.featured) {
      await prisma.match.update({ where: { id }, data: { featured: false } });
    }
  }

  if (typeof body.featured === "boolean") {
    if (body.featured) {
      const tierAfterEdit = (data.tier as number | undefined) ?? current.tier;
      if (tierAfterEdit === 4) {
        return NextResponse.json(
          { error: "Correct Score can't be the free pick" },
          { status: 400 }
        );
      }
      await prisma.match.updateMany({ where: { featured: true }, data: { featured: false } });
      data.lastFeaturedAt = new Date();
    }
    data.featured = body.featured;
  }
  if (typeof body.settled === "boolean") {
    data.settled = body.settled;
    data.result = body.settled ? body.result ?? null : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await prisma.match.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.match.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
