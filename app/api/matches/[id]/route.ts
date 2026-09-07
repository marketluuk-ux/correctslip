import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.featured === "boolean") {
    if (body.featured) {
      const match = await prisma.match.findUnique({ where: { id } });
      if (match?.tier === 4) {
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
