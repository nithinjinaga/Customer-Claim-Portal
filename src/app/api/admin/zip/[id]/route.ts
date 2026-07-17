import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { downloadFile } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const complaint = await db.complaint.findUnique({
    where: { complaintId: id.toUpperCase() },
    include: { attachments: true },
  });
  if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "AGENT" && complaint.assignedToId !== session.sub)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  if (complaint.attachments.length === 0)
    return NextResponse.json({ error: "No files attached" }, { status: 404 });

  // ponytail: buffers the whole ZIP in memory — fine for ≤11 files ≤100MB each; stream if that ceiling moves
  const zip = new JSZip();
  for (const a of complaint.attachments) {
    try {
      const blob = await downloadFile(a.storagePath);
      zip.file(`${a.kind.toLowerCase()}-${a.originalName}`, await blob.arrayBuffer());
    } catch {
      zip.file(`MISSING-${a.originalName}.txt`, `Could not fetch ${a.storagePath}`);
    }
  }
  const buf = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${complaint.complaintId}-evidence.zip"`,
    },
  });
}
