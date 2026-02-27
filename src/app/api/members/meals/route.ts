import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meals = await prisma.meal.findMany({
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ meals });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const member = await prisma.member.findUnique({ where: { userId: user.userId } });
  if (!member) return NextResponse.json({ error: "Create your profile first" }, { status: 400 });

  const data = await req.json();

  const meal = await prisma.meal.create({
    data: {
      memberId: member.id,
      mealName: data.mealName,
      portions: data.portions || 1,
      dietaryTags: data.dietaryTags,
    },
  });

  return NextResponse.json({ meal });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { userId: user.userId } });
  const meal = await prisma.meal.findUnique({ where: { id } });

  if (!meal || (meal.memberId !== member?.id && !(user as any).isAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.meal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
