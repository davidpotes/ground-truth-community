/**
 * /api/members/assets — Camp equipment and supply inventory
 * 
 * GET    — List all camp assets with inventory details (authenticated users)
 * POST   — Create new asset item (authenticated users)
 * PUT    — Update asset fields (authenticated users, limited fields)
 * DELETE — Remove asset by id query param (authenticated users)
 * 
 * Request body (POST/PUT): Asset fields (itemName, category, qtyNeeded, etc.)
 * Response: { assets: Array } | { asset: Object } | { ok: true }
 * 
 * Manages camp inventory, transportation assignments, and storage tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assets = await prisma.asset.findMany({
    orderBy: [{ category: "asc" }, { itemName: "asc" }],
  });

  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();

  const asset = await prisma.asset.create({
    data: {
      itemName: data.itemName,
      category: data.category || "general",
      qtyNeeded: data.qtyNeeded || 0,
      qtyHave: data.qtyHave || 0,
      custodian: data.custodian || null,
      condition: data.condition || null,
      storageLocation: data.storageLocation || null,
      willBring: data.willBring || null,
      transportVehicle: data.transportVehicle || null,
      notes: data.notes || null,
    },
  });

  return NextResponse.json({ asset });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const { id, ...updateData } = data;

  // Whitelist allowed fields — never allow direct photoUrl modification via PUT
  const allowed = ['itemName', 'category', 'qtyNeeded', 'qtyHave', 'custodian',
    'condition', 'storageLocation', 'willBring', 'transportVehicle', 'notes', 'lastInventoried'];
  const safeData: Record<string, any> = {};
  for (const key of allowed) {
    if (key in updateData) safeData[key] = updateData[key];
  }

  const asset = await prisma.asset.update({
    where: { id },
    data: safeData,
  });

  return NextResponse.json({ asset });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
