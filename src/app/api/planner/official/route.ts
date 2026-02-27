import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET — fetch the official/locked layout (any authenticated user)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const layouts = await prisma.asset.findMany({
    where: { category: "layout" },
  });

  const official = layouts.find((l: any) => {
    try {
      const data = JSON.parse(l.notes || "{}");
      return data._official === true;
    } catch {
      return false;
    }
  });

  if (!official) {
    return NextResponse.json({ layout: null });
  }

  let parsed;
  try {
    parsed = JSON.parse(official.notes || "{}");
  } catch {
    parsed = {};
  }

  return NextResponse.json({
    layout: {
      id: official.id,
      name: official.itemName,
      data: parsed._items || (Array.isArray(parsed) ? parsed : []),
      updatedAt: official.updatedAt,
    },
  });
}

// POST — lock/unlock a layout as official (admin only)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const body = await req.json();
  const { layoutId, lock } = body;

  if (!layoutId) {
    return NextResponse.json({ error: "layoutId required" }, { status: 400 });
  }

  // Clear any existing official flag
  const allLayouts = await prisma.asset.findMany({
    where: { category: "layout" },
  });

  for (const layout of allLayouts) {
    try {
      const data = JSON.parse(layout.notes || "{}");
      if (data._official) {
        delete data._official;
        await prisma.asset.update({
          where: { id: layout.id },
          data: { notes: JSON.stringify(data) },
        });
      }
    } catch {}
  }

  // If locking, set the flag on target
  if (lock !== false) {
    const target = await prisma.asset.findUnique({ where: { id: layoutId } });
    if (!target) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }
    try {
      const data = JSON.parse(target.notes || "{}");
      data._official = true;
      await prisma.asset.update({
        where: { id: layoutId },
        data: { notes: JSON.stringify(data) },
      });
    } catch {
      return NextResponse.json({ error: "Invalid layout data" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, locked: lock !== false });
}
