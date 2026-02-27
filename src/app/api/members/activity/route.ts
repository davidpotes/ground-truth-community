/**
 * /api/members/activity — Client-side activity logging endpoint
 * 
 * POST — Record user actions and page views (authenticated users)
 * 
 * Request body: { action: string, detail?: string }
 * Response: { ok: true }
 * 
 * Used by ActivityTracker component for analytics.
 * Logs page views, button clicks, and other user interactions.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Record user activity for analytics
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).userId;
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

  const { action, detail } = await req.json();
  if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

  await prisma.activityLog.create({
    data: { userId, action, detail: detail || null },
  });

  return NextResponse.json({ ok: true });
}
