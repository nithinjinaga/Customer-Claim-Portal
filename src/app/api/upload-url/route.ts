import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { createSignedUploadUrl } from "@/lib/storage";
import {
  IMAGE_TYPES,
  VIDEO_TYPES,
  INVOICE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_INVOICE_BYTES,
} from "@/lib/validation";

export async function GET() {
  return NextResponse.json({
    configured:
      !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: "File storage is not configured yet" },
      { status: 503 },
    );
  }

  const { fileName, mimeType, sizeBytes, kind, thumbnail } = await req.json();
  if (typeof fileName !== "string" || typeof mimeType !== "string" || typeof sizeBytes !== "number") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const rules =
    kind === "INVOICE"
      ? { types: INVOICE_TYPES, max: MAX_INVOICE_BYTES }
      : mimeType.startsWith("video/")
        ? { types: VIDEO_TYPES, max: MAX_VIDEO_BYTES }
        : { types: IMAGE_TYPES, max: MAX_IMAGE_BYTES };

  if (!rules.types.includes(mimeType)) {
    return NextResponse.json({ error: `File type ${mimeType} is not allowed` }, { status: 400 });
  }
  if (sizeBytes > rules.max) {
    return NextResponse.json(
      { error: `File exceeds the ${Math.round(rules.max / 1048576)}MB limit` },
      { status: 400 },
    );
  }

  const safeName = fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
  const base = `${session.sub}/${randomUUID()}`;
  const upload = await createSignedUploadUrl(`${base}-${safeName}`);
  const thumb = thumbnail ? await createSignedUploadUrl(`${base}-thumb.jpg`) : null;

  return NextResponse.json({
    path: upload.path,
    signedUrl: upload.signedUrl,
    thumb: thumb ? { path: thumb.path, signedUrl: thumb.signedUrl } : null,
  });
}
