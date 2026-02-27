/**
 * /api/admin/dues — Camp dues and payment management
 * 
 * GET  — List dues items with payments and member balances (admin only)
 * POST — Create dues item or record payment (admin only)
 * PUT  — Update dues item details (admin only)
 * DELETE — Remove dues item by id query param (admin only)
 * 
 * Request body (POST): DuesItem fields or payment record
 * Response: { items: Array, members: Array } | { item: Object } | { ok: true }
 * 
 * Supports custom amounts per member, multiple payment methods, and balance tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) return null;
  return session;
}

// GET: all dues items + payments + member summary
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.duesItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      payments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { paidAt: "desc" },
      },
      overrides: true,
    },
  });

  // Get all members for the roster
  const users = await prisma.user.findMany({
    where: { member: { isNot: null } },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ items, users });
}

// POST: create dues item
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  if (!data.name || !data.amount) {
    return NextResponse.json({ error: "Name and amount required" }, { status: 400 });
  }

  const item = await prisma.duesItem.create({
    data: {
      name: data.name,
      amount: parseFloat(data.amount),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      description: data.description || null,
    },
  });

  return NextResponse.json({ item });
}

// PUT: update dues item OR record payment
export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();

  // Set per-member override
  if (data.action === "override") {
    const override = await prisma.duesOverride.upsert({
      where: { userId_duesItemId: { userId: data.userId, duesItemId: data.duesItemId } },
      update: { amount: parseFloat(data.amount), reason: data.reason || null },
      create: {
        userId: data.userId,
        duesItemId: data.duesItemId,
        amount: parseFloat(data.amount),
        reason: data.reason || null,
      },
    });
    return NextResponse.json({ override });
  }

  // Remove override
  if (data.action === "removeOverride") {
    await prisma.duesOverride.delete({
      where: { userId_duesItemId: { userId: data.userId, duesItemId: data.duesItemId } },
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  // Record a payment
  if (data.action === "payment") {
    const payment = await prisma.duesPayment.create({
      data: {
        userId: data.userId,
        duesItemId: data.duesItemId,
        amount: parseFloat(data.amount),
        method: data.method || "venmo",
        note: data.note || null,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        recordedBy: (session.user as any).name || (session.user as any).email,
      },
    });
    return NextResponse.json({ payment });
  }

  // Update a dues item
  if (data.id) {
    const item = await prisma.duesItem.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amount !== undefined && { amount: parseFloat(data.amount) }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
    });
    return NextResponse.json({ item });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// DELETE: remove a payment
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

  await prisma.duesPayment.delete({ where: { id: paymentId } });
  return NextResponse.json({ ok: true });
}
