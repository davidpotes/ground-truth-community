/**
 * /api/admin/invites — Invite code management system
 * 
 * GET    — List all invite codes with usage status (admin only)
 * POST   — Generate new invite code (admin only)
 * DELETE — Remove invite code by id query param (admin only)
 * 
 * Response: { invites: Array } | { invite: Object } | { ok: true }
 * 
 * Generates themed invite codes with camp/playa prefixes for better UX.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Generate themed invite codes with camp-appropriate prefixes
function generateCode() {
  const prefixes = [
    // Camp / playa
    "TRUTH", "DUSTY", "PLAYA", "DECOM", "BRNR2", "GATEN", "BLKRC", "CAMPX",
    // Generic
    "MEMBR", "INVTE", "WELCM", "JOINU", "CREW7", "SQUAD", "TRIBE",
  ];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${suffix}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invite = await prisma.inviteCode.create({
    data: { code: generateCode() },
  });

  return NextResponse.json({ invite });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.inviteCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
