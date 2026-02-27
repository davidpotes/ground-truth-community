/**
 * /api/track — Campaign click tracking endpoint
 * 
 * POST — Track a campaign click (public, rate-limited)
 * 
 * Request body: { ref: string } (campaign case reference)
 * Response: { ok: boolean }
 * Rate limit: 20 clicks per IP per hour
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Rate limiter for click tracking: more generous than applications (20/hour vs 5/hour)
const clickLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup every 10 minutes to prevent memory leaks
setInterval(() => { 
  const now = Date.now(); 
  for (const [k, v] of clickLimitMap) { 
    if (now > v.resetAt) clickLimitMap.delete(k); 
  } 
}, 10 * 60 * 1000);
export async function POST(req: NextRequest) {
  try {
    // Extract client IP for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";
    
    // Check rate limit (inline for performance)
    const now = Date.now();
    const entry = clickLimitMap.get(ip);
    
    // Reject if over limit
    if (entry && now < entry.resetAt && entry.count >= 20) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    
    // Initialize or increment counter
    if (!entry || now > entry.resetAt) {
      clickLimitMap.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 hour window
    } else {
      entry.count++;
    }

    // Validate campaign reference
    const { ref } = await req.json();
    if (!ref || typeof ref !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Look up campaign by case reference
    const campaign = await prisma.campaign.findUnique({ where: { caseRef: ref } });
    if (!campaign) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    // Record click for analytics (no personal data stored)
    await prisma.campaignClick.create({
      data: { campaignId: campaign.id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Return generic error to avoid information leakage
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
