/**
 * /api/admin/recruits — Recruit pipeline management
 * 
 * GET    — List all recruits with intake data (admin only)
 * POST   — Create a new recruit (admin only)
 * PUT    — Update recruit fields (admin only, whitelisted fields)
 * DELETE — Remove a recruit by id query param (admin only)
 * 
 * Request body (POST/PUT): Recruit fields (name, email, stage, etc.)
 * Response: { recruits: Array } | { recruit: Object } | { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const recruits = await prisma.recruit.findMany({
    include: { intake: true, assignedTo: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ recruits });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();

  const recruit = await prisma.recruit.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      socialHandle: data.socialHandle,
      stage: data.stage || "prospect",
      confidence: data.confidence ?? 50,
      notes: data.notes,
      lastContactDate: data.lastContactDate,
    },
  });

  return NextResponse.json({ recruit });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { id, ...raw } = data;

  // Field whitelisting: only allow specific fields to be updated for security
  const allowed = ['name', 'email', 'phone', 'socialHandle', 'stage', 'confidence',
    'notes', 'lastContactDate', 'assignedToId', 'referredById'];
  const updateData: Record<string, any> = {};
  
  // Filter input to only include whitelisted fields
  for (const key of allowed) {
    if (key in raw) updateData[key] = raw[key];
  }

  const recruit = await prisma.recruit.update({
    where: { id },
    data: { ...updateData, updatedAt: new Date() },
  });

  return NextResponse.json({ recruit });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.recruit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
