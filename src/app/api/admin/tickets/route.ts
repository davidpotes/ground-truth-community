/**
 * /api/admin/tickets — Burning Man ticket distribution system
 * 
 * GET    — List all tickets with status and assignment (admin only)
 * POST   — Create new ticket (admin only)
 * PUT    — Update ticket status and assignments (admin only)
 * DELETE — Remove ticket by id query param (admin only)
 * 
 * Request body (POST): { type: string, price?: number }
 * Request body (PUT): { id: string, ...fields }
 * Response: { tickets: Array } | { ticket: Object } | { ok: true }
 * 
 * Manages steward sale tickets, SAP tickets, vehicle passes, and transfers.
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

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tickets = await prisma.ticket.findMany({
    orderBy: [{ type: "asc" }, { status: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();

  // Support batch creation
  const count = data.count || 1;
  const tickets = [];
  for (let i = 0; i < count; i++) {
    const ticket = await prisma.ticket.create({
      data: {
        type: data.type,
        status: data.status || "available",
        assignedTo: data.assignedTo || null,
        price: data.price || null,
        notes: data.notes || null,
      },
    });
    tickets.push(ticket);
  }

  return NextResponse.json({ tickets });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { id, ...updateData } = data;

  const ticket = await prisma.ticket.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ ticket });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.ticket.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
