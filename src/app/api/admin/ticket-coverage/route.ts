import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.member.findMany({
    where: { status: "active" },
    select: {
      id: true,
      playaName: true,
      hasTicket: true,
      ticketSource: true,
      hasVehiclePass: true,
      vehiclePassSource: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { playaName: "asc" },
  });

  return NextResponse.json({ members });
}
