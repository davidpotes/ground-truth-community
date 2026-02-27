/**
 * /api/apply — Public recruit application endpoint
 * 
 * POST — Submit a new recruit application (public, rate-limited)
 * 
 * Request body: {
 *   namePronouns: string,
 *   email?: string,
 *   socialHandle?: string,
 *   projectDescription?: string,
 *   enthusiasm?: string,
 *   campScenario?: string,
 *   gentleReminder?: string,
 *   approachStrangers?: string,
 *   theatrical?: string,
 *   straightFace?: string,
 *   beingApproached?: string,
 *   idealBalance?: string,
 *   burnExperience?: string,
 *   campingSetup?: string,
 *   skillsResources?: string,
 *   duesQuestions?: string,
 *   anythingElse?: string,
 *   caseRef?: string
 * }
 * 
 * Response: { ok: true } | { error: string }
 * Rate limit: 5 applications per IP per hour
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Rate limiter: prevents spam applications by limiting to 5 per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  // No entry or expired window - reset the limit
  if (!entry || now > entry.resetAt) {
    // Periodic cleanup to prevent memory leaks (limit to 100 IPs)
    if (rateLimitMap.size > 100) {
      for (const [k, v] of rateLimitMap) { 
        if (now > v.resetAt) rateLimitMap.delete(k); 
      }
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  // Check if IP has exceeded rate limit
  if (entry.count >= RATE_LIMIT) return false;
  
  // Increment counter and allow request
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Extract client IP for rate limiting (handles proxies and load balancers)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
    
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many applications. Please try again later." }, { status: 429 });
  }

  const data = await req.json();

  // Validate required fields
  if (!data.namePronouns?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Store complete intake responses for admin review
  const intake = await prisma.recruitIntake.create({
    data: {
      namePronouns: data.namePronouns,
      email: data.email || null,
      socialHandle: data.socialHandle || null,
      projectDescription: data.projectDescription || null,
      enthusiasm: data.enthusiasm || null,
      campScenario: data.campScenario || null,
      gentleReminder: data.gentleReminder || null,
      approachStrangers: data.approachStrangers || null,
      theatrical: data.theatrical || null,
      straightFace: data.straightFace || null,
      beingApproached: data.beingApproached || null,
      idealBalance: data.idealBalance || null,
      burnExperience: data.burnExperience || null,
      campingSetup: data.campingSetup || null,
      skillsResources: data.skillsResources || null,
      duesQuestions: data.duesQuestions || null,
      anythingElse: data.anythingElse || null,
    },
  });

  // Parse name from "Name (they/them)" or "Name / Pronouns" format
  const name = data.namePronouns.split(/[\/,]/)[0].trim();

  // Automatically create recruit record in pipeline for admin workflow
  await prisma.recruit.create({
    data: {
      name,
      email: data.email || null,
      socialHandle: data.socialHandle || null,
      stage: "prospect", // Initial stage for new applicants
      confidence: 50,    // Neutral starting confidence
      intakeId: intake.id,
      notes: data.caseRef
        ? `Applied via intake form [ref: ${data.caseRef}]` // Link to referring member
        : `Applied via intake form`,
      referredById: data.caseRef || null,
    },
  });

  return NextResponse.json({ ok: true });
}
