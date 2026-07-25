import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { createSignedUploadUrl } from "@/lib/storage";
import {
  IMAGE_TYPES,
  VIDEO_TYPES,
  INVOICE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_INVOICE_BYTES,
} from "@/lib/validation";

// Signed-URL request throttle: 60 per minute per IP.
const UPLOAD_LIMIT = 60;
const UPLOAD_WINDOW_MS = 60_000;

export async function GET() {
  return NextResponse.json({
    configured:
      !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}

export async function POST(req: NextRequest) {
  // Anonymous filing is allowed — logged-in uploads go under the user id,
  // anonymous ones under an "anon/" prefix.
  const session = await getSession();
  const owner = session?.sub ?? "anon";

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: "File storage is not configured yet" },
      { status: 503 },
    );
  }

  // Cap signed-URL requests per IP to prevent storage-bucket abuse.
  if (!rateLimit(`upload:${await clientIpHash()}`, UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many upload requests. Please slow down." },
      { status: 429 },
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
  const base = `${owner}/${randomUUID()}`;
  const upload = await createSignedUploadUrl(`${base}-${safeName}`);
  const thumb = thumbnail ? await createSignedUploadUrl(`${base}-thumb.jpg`) : null;

  return NextResponse.json({
    path: upload.path,
    signedUrl: upload.signedUrl,
    thumb: thumb ? { path: thumb.path, signedUrl: thumb.signedUrl } : null,
  });
}
