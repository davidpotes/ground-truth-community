/**
 * /api/admin/users — User management for administrators
 * 
 * GET — List all users with admin status (admin only)
 * PUT — Update user admin privileges (admin only, with safety checks)
 * 
 * Request body (PUT): { id: string, isAdmin: boolean }
 * Response: { users: Array } | { ok: true, isAdmin: boolean }
 * 
 * Safety features:
 * - Prevents self-demotion
 * - Prevents removing the last admin
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: { member: { select: { playaName: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
      playaName: u.member?.playaName,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, isAdmin } = await req.json();
  if (!id || typeof isAdmin !== "boolean") {
    return NextResponse.json({ error: "Missing id or isAdmin" }, { status: 400 });
  }

  // Safety check #1: Prevent self-demotion (admin cannot remove their own privileges)
  if (id === (session.user as any).id && !isAdmin) {
    return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
  }

  // Safety check #2: Prevent removing the last admin (system lockout protection)
  if (!isAdmin) {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
    }
  }

  // Update user admin status
  const user = await prisma.user.update({
    where: { id },
    data: { isAdmin },
  });

  return NextResponse.json({ ok: true, isAdmin: user.isAdmin });
}
