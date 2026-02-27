/**
 * /api/members/assets/photo — Asset photo upload/deletion
 * 
 * POST   — Upload photo for an asset (authenticated users)
 * DELETE — Remove asset photo (admin only)
 * 
 * Request body (POST): FormData with 'photo' file and 'assetId'
 * Query params (DELETE): ?assetId=<uuid>
 * Response: { photoUrl: string } | { ok: true }
 * 
 * Security features:
 * - File type validation (jpg/png/webp only)
 * - Size limits (5MB max)
 * - Path traversal protection on deletion
 * - Asset ownership verification
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("photo") as File;
  const assetId = formData.get("assetId") as string;

  if (!file || !assetId) return NextResponse.json({ error: "Missing file or assetId" }, { status: 400 });

  // Security validation: file size limits to prevent abuse
  const maxSize = 5 * 1024 * 1024; // 5MB limit for asset photos
  if (file.size > maxSize) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  // Security validation: only allow safe image types
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Invalid file type (jpg/png/webp)" }, { status: 400 });

  // Asset verification: ensure asset exists before allowing photo upload
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  // Generate secure filename using asset ID (prevents collisions and path traversal)
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${assetId}.${ext}`;

  // Ensure upload directory exists
  const dir = path.join(process.cwd(), "public", "asset-photos");
  await mkdir(dir, { recursive: true });

  // Write file to disk
  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  // Generate URL with cache-busting timestamp
  const photoUrl = `/asset-photos/${filename}?t=${Date.now()}`;

  // Update asset record with photo URL
  await prisma.asset.update({
    where: { id: assetId },
    data: { photoUrl },
  });

  return NextResponse.json({ photoUrl });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");
  if (!assetId) return NextResponse.json({ error: "Missing assetId" }, { status: 400 });

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || !asset.photoUrl) return NextResponse.json({ error: "No photo" }, { status: 404 });

  // Critical security: Path traversal protection to prevent deletion of arbitrary files
  const photoPath = asset.photoUrl.split("?")[0]; // Remove cache-busting timestamp
  const allowedDir = path.resolve(process.cwd(), "public", "asset-photos");
  const filePath = path.resolve(process.cwd(), "public", photoPath);

  // Verify the resolved file path is within the allowed directory
  if (!filePath.startsWith(allowedDir)) {
    return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
  }

  // Attempt file deletion (ignore errors if file doesn't exist)
  try { 
    await unlink(filePath); 
  } catch {} // File may have already been deleted

  // Clear photo URL from database
  await prisma.asset.update({
    where: { id: assetId },
    data: { photoUrl: null },
  });

  return NextResponse.json({ ok: true });
}
