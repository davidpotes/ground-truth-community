/**
 * /api/announcements — Time-limited announcement system
 * 
 * GET    — List all active announcements (authenticated users)
 * POST   — Create new announcement (authenticated users)
 * DELETE — Remove announcement by id query param (author or admin only)
 * 
 * Request body (POST): { message: string, emoji?: string, color?: string, expiresInDays?: number }
 * Response: { announcements: Array } | { announcement: Object } | { ok: true }
 * 
 * Features automatic expiration (1-30 days) and 140-character limit.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Load all non-expired announcements
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const announcements = await prisma.announcement.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { author: { select: { id: true, name: true, member: { select: { playaName: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcements });
}

// POST — any member can create
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).userId;
  const { message, emoji, color, expiresInDays } = await req.json();

  if (!message || message.length > 140) {
    return NextResponse.json({ error: "Message required (max 140 chars)" }, { status: 400 });
  }

  const days = Math.min(Math.max(expiresInDays || 7, 1), 30);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const announcement = await prisma.announcement.create({
    data: {
      message,
      emoji: emoji || null,
      color: color || "indigo",
      authorId: userId,
      expiresAt,
    },
  });

  return NextResponse.json({ announcement });
}

// DELETE — author or admin
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).userId;
  const isAdmin = (session.user as any).isAdmin;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (announcement.authorId !== userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
