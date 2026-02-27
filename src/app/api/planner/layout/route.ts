/**
 * /api/planner/layout — Camp planner layout persistence
 * 
 * GET    — Load all saved layouts (authenticated users)
 * POST   — Save a layout (admin only)
 * DELETE — Remove a layout (admin only)
 * 
 * Request body (POST): { name: string, data: Array, id?: string }
 * Request body (DELETE): { id: string }
 * Response: { layouts: Array } | { id: string, action: string } | { ok: true }
 * 
 * Layout format: Uses envelope structure { _items: [...], _official?: true }
 * to preserve metadata across save/load cycles
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Load all saved camp layouts
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assets = await prisma.asset.findMany({
    where: { category: "layout" },
    orderBy: { updatedAt: "desc" },
  });

  const layouts = assets.map((a) => {
    let parsed = a.notes ? JSON.parse(a.notes) : null;
    
    // Backward compatibility: support both envelope format and legacy raw arrays
    const items = parsed?._items || (Array.isArray(parsed) ? parsed : null);
    const isOfficial = parsed?._official === true;
    
    return {
      id: a.id,
      name: a.itemName,
      data: items,
      isOfficial,
      updatedAt: a.updatedAt,
    };
  });

  return NextResponse.json({ layouts });
}

// Save or update a camp layout
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, data, id } = await req.json();
  if (!name || !data) {
    return NextResponse.json({ error: "name and data required" }, { status: 400 });
  }

  // Envelope format: wraps layout items with metadata for future extensibility
  let envelope: any = { _items: data };
  
  if (id) {
    // Metadata preservation: maintain flags like _official when updating existing layouts
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (existing?.notes) {
      try {
        const old = JSON.parse(existing.notes);
        if (old._official) envelope._official = true; // Keep official status
      } catch {} // Ignore parse errors
    }
  }
  const serialized = JSON.stringify(envelope);

  if (id) {
    // Update existing layout
    const updated = await prisma.asset.update({
      where: { id },
      data: { itemName: name, notes: serialized, updatedAt: new Date() },
    });
    return NextResponse.json({ id: updated.id, action: "updated" });
  } else {
    // Create new layout (stored as Asset with category="layout")
    const created = await prisma.asset.create({
      data: {
        itemName: name,
        category: "layout",
        qtyNeeded: 0,  // Required fields, not used for layouts
        qtyHave: 0,
        notes: serialized,
      },
    });
    return NextResponse.json({ id: created.id, action: "created" });
  }
}

// DELETE: remove a saved layout
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
