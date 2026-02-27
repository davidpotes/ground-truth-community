import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Members can see their tickets and request available ones
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email;

  // Get tickets assigned to or requested by this user
  const myTickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { assignedTo: email },
        { requestedBy: email },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get summary of available tickets by type
  const available = await prisma.ticket.groupBy({
    by: ["type"],
    where: { status: "available" },
    _count: true,
  });

  return NextResponse.json({ myTickets, available });
}

// Member requests a ticket
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const email = session.user.email;

  // Find an available ticket of the requested type
  const ticket = await prisma.ticket.findFirst({
    where: { type: data.type, status: "available" },
  });

  if (!ticket) {
    return NextResponse.json({ error: "No tickets available of this type" }, { status: 404 });
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "requested",
      requestedBy: email,
      notes: data.notes || null,
    },
  });

  return NextResponse.json({ ticket: updated });
}
