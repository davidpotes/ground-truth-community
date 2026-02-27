/**
 * /api/members/profile — Member profile management
 * 
 * GET — Load current user's member profile (authenticated users)
 * PUT — Update member profile fields (authenticated users)
 * 
 * Request body (PUT): Member profile fields (playaName, phone, vehicle, etc.)
 * Response: { member: Object }
 * 
 * Automatically syncs playa name to user display name when updated.
 * Uses upsert to handle first-time profile creation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const member = await prisma.member.findUnique({
    where: { userId: user.userId },
  });

  return NextResponse.json({ member });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const data = await req.json();

  // Update display name to playa name if provided
  if (data.playaName) {
    await prisma.user.update({
      where: { id: user.userId },
      data: { name: data.playaName },
    });
  }

  const profileData = {
    playaName: data.playaName,
    pronouns: data.pronouns,
    homeBase: data.homeBase,
    phone: data.phone,
    emergencyContact: data.emergencyContact,
    emergencyPhone: data.emergencyPhone,
    vehicle: data.vehicle,
    arrivalDate: data.arrivalDate,
    departureDate: data.departureDate,
    campingSetup: data.campingSetup,
    campRole: data.campRole,
    dietaryNotes: data.dietaryNotes,
    hasTicket: data.hasTicket ?? false,
    ticketSource: data.ticketSource || null,
    hasVehiclePass: data.hasVehiclePass ?? false,
    vehiclePassSource: data.vehiclePassSource || null,
  };

  const member = await prisma.member.upsert({
    where: { userId: user.userId },
    update: profileData,
    create: { userId: user.userId, ...profileData },
  });

  return NextResponse.json({ member });
}
