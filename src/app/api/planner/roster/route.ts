import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.member.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const roster = members.map((m) => ({
    id: m.userId,
    name: m.user.name || m.userId,
    playaName: m.playaName,
  }));

  return NextResponse.json({ roster });
}
