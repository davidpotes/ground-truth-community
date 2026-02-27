/**
 * /api/admin/campaigns — Marketing campaign analytics and management
 * 
 * GET    — List campaigns with click metrics and recruitment funnel data (admin only)
 * POST   — Create new campaign with unique case reference (admin only)
 * PUT    — Update campaign fields (admin only)
 * DELETE — Remove campaign by id query param (admin only)
 * 
 * Request body (POST): { name: string, caseRef: string, channel: string, notes?: string, launched?: boolean }
 * Request body (PUT): { id: string, ...fields }
 * Response: { campaigns: Array } | { campaign: Object } | { ok: true }
 * 
 * Tracks recruitment attribution by matching case refs to recruit records.
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
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clicks: true } } },
  });

  // Get funnel metrics for each campaign
  const recruits = await prisma.recruit.findMany({
    select: { referredById: true, stage: true, notes: true },
  });

  // Also count page views per ref from activity logs
  const pageViews = await prisma.activityLog.findMany({
    where: { action: "page_view", detail: { contains: "/cri" } },
  });

  const metrics = campaigns.map((c) => {
    // Match recruits by case ref (stored in referredById or notes)
    const matched = recruits.filter(
      (r) => r.referredById === c.caseRef || (r.notes && r.notes.includes(`ref: ${c.caseRef}`))
    );

    const byStage: Record<string, number> = {};
    matched.forEach((r) => {
      byStage[r.stage] = (byStage[r.stage] || 0) + 1;
    });

    return {
      ...c,
      clicks: (c as any)._count?.clicks || 0,
      funnel: {
        total: matched.length,
        byStage,
      },
    };
  });

  return NextResponse.json({ campaigns: metrics });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  if (!data.name || !data.caseRef || !data.channel) {
    return NextResponse.json({ error: "Name, case ref, and channel required" }, { status: 400 });
  }

  // Check uniqueness
  const existing = await prisma.campaign.findUnique({ where: { caseRef: data.caseRef } });
  if (existing) return NextResponse.json({ error: "Case ref already exists" }, { status: 400 });

  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      caseRef: data.caseRef,
      channel: data.channel,
      notes: data.notes || null,
      launchedAt: data.launched ? new Date() : null,
    },
  });

  return NextResponse.json({ campaign });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { id, ...update } = data;

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(update.name !== undefined && { name: update.name }),
      ...(update.channel !== undefined && { channel: update.channel }),
      ...(update.notes !== undefined && { notes: update.notes }),
      ...(update.active !== undefined && { active: update.active }),
      ...(update.launched && { launchedAt: new Date() }),
    },
  });

  return NextResponse.json({ campaign });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
