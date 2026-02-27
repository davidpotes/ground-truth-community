import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const formData = await req.formData();
  const file = formData.get("avatar") as File;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Validate
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${user.userId}.${ext}`;

  // Save to public/avatars/ (served by Nginx directly)
  const dir = path.join(process.cwd(), "public", "avatars");
  await mkdir(dir, { recursive: true });

  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  const avatarUrl = `/avatars/${filename}`;

  // Update member
  await prisma.member.update({
    where: { userId: user.userId },
    data: { avatar: avatarUrl },
  });

  return NextResponse.json({ avatar: avatarUrl });
}
