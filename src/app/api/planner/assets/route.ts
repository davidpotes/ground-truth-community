/**
 * /api/planner/assets — Camp planner to asset inventory integration
 * 
 * POST — Bulk import/update assets from camp planner export (admin only)
 * 
 * Request body: { assets: Array<{ itemName, category, qtyNeeded, notes }> }
 * Response: { results: Array<{ action, id, itemName }>, count: number }
 * 
 * Bridges camp layout planning with asset inventory by updating quantities
 * needed based on planner exports. Updates existing assets or creates new ones.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Bulk import assets from camp layout planner
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assets } = await req.json();
  if (!Array.isArray(assets)) {
    return NextResponse.json({ error: "Expected assets array" }, { status: 400 });
  }

  const results = [];
  for (const item of assets) {
    // Check if asset with same name and category already exists
    const existing = await prisma.asset.findFirst({
      where: { itemName: item.itemName, category: item.category },
    });

    if (existing) {
      // Update qty needed
      const updated = await prisma.asset.update({
        where: { id: existing.id },
        data: { qtyNeeded: item.qtyNeeded, notes: item.notes || existing.notes },
      });
      results.push({ action: "updated", id: updated.id, itemName: updated.itemName });
    } else {
      const created = await prisma.asset.create({
        data: {
          itemName: item.itemName,
          category: item.category || "shade",
          qtyNeeded: item.qtyNeeded || 0,
          qtyHave: item.qtyHave || 0,
          notes: item.notes || "",
        },
      });
      results.push({ action: "created", id: created.id, itemName: created.itemName });
    }
  }

  return NextResponse.json({ results, count: results.length });
}
