/**
 * /api/admin/analytics — User engagement and activity analytics
 * 
 * GET — User activity statistics and recent action log (admin only)
 * 
 * Response: { 
 *   analytics: Array<{ id, name, lastLoginAt, actionsThisWeek, etc }>,
 *   recentActivity: Array<ActivityLog>
 * }
 * 
 * Provides insights into member engagement, page views, and system usage patterns.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // All users with member info
  const users = await prisma.user.findMany({
    include: {
      member: { select: { playaName: true } },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: { lastLoginAt: "desc" },
  });

  // Recent activity (last 50)
  const recentActivity = await prisma.activityLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const analytics = users.map((u) => {
    const recentLogs = u.activityLogs.filter((l) => l.createdAt >= weekAgo);
    const lastPage = u.activityLogs.find((l) => l.action === "page_view");
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      playaName: u.member?.playaName,
      isAdmin: u.isAdmin,
      lastLoginAt: u.lastLoginAt,
      loginCount: u.loginCount,
      actionsThisWeek: recentLogs.length,
      lastPage: lastPage?.detail || null,
      lastActivity: u.activityLogs[0]?.createdAt || null,
    };
  });

  return NextResponse.json({ analytics, recentActivity });
}
