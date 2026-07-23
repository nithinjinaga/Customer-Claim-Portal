"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { complaintSchema, attachmentsRelaxedSchema } from "@/lib/validation";
import {
  sendEmail,
  complaintConfirmationEmail,
  internalNewComplaintEmail,
  esc,
} from "@/lib/email";
import { STATUS_LABEL } from "@/components/ui";

import { nextComplaintId } from "@/lib/complaint-id";

const MAX_PER_HOUR = 5;

// ponytail: fixed fallback salt — set IP_HASH_SALT in prod so hashes aren't guessable
async function hashIp() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return createHash("sha256").update((process.env.IP_HASH_SALT ?? "pe-portal") + ip).digest("hex");
}

export async function submitComplaint(
  raw: unknown,
): Promise<{ complaintId?: string; error?: string }> {
  const ipHash = await hashIp();

  // Public form is always anonymous — rate limit by hashed IP.
  const recent = await db.complaint.count({
    where: {
      submitterIpHash: ipHash,
      createdAt: { gt: new Date(Date.now() - 3600_000) },
    },
  });
  if (recent >= MAX_PER_HOUR) {
    return { error: `You have reached the limit of ${MAX_PER_HOUR} complaints per hour. Please try again later.` };
  }

  const storageConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = storageConfigured
    ? complaintSchema
    : // dev stub: storage off → attachments may be empty
      complaintSchema.extend({ attachments: attachmentsRelaxedSchema });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { contact, site, modules, defect, attachments } = parsed.data;

  const complaint = await db.$transaction(async (tx) => {
    const complaintId = await nextComplaintId(tx);
    return tx.complaint.create({
      data: {
        complaintId,
        userId: null,
        customerName: contact.name,
        customerEmail: contact.email,
        customerPhone: contact.phone,
        customerAltPhone: contact.altPhone ?? null,
        submitterIpHash: ipHash,
        ...site,
        ...modules,
        ...defect,
        attachments: { create: attachments },
        statusEvents: { create: { status: "SUBMITTED" } },
      },
    });
  });

  const defectLabel =
    defect.defectType === "TECHNICAL_FAULT" ? "Technical Fault" : "Transit Breakage";
  const dash = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));
  const summaryHtml = `<table style="width:100%;font-size:13px;line-height:1.8">
    <tr><td style="color:#5b6b7b">Defect type</td><td><strong>${defectLabel}</strong></td></tr>
    <tr><td style="color:#5b6b7b">Site</td><td>${esc(site.siteAddress)}</td></tr>
    <tr><td style="color:#5b6b7b">Capacity</td><td>${dash(site.siteCapacityKwp)} KWp</td></tr>
    <tr><td style="color:#5b6b7b">Defective modules</td><td>${dash(modules.defectiveQty)} × ${dash(modules.wpRating)} Wp</td></tr>
    <tr><td style="color:#5b6b7b">Serial numbers</td><td>${modules.serialNumbers.map(esc).join(", ")}</td></tr>
    <tr><td style="color:#5b6b7b">Status</td><td>${STATUS_LABEL[complaint.status]}</td></tr>
  </table>`;

  await sendEmail(
    contact.email,
    `Complaint ${complaint.complaintId} registered · Premier Energies`,
    complaintConfirmationEmail(contact.name, complaint.complaintId, summaryHtml),
  );
  const internal = process.env.AFTER_SALES_EMAIL;
  if (internal) {
    await sendEmail(
      internal,
      `[New complaint] ${complaint.complaintId} · ${defectLabel} · ${contact.name}`,
      internalNewComplaintEmail(
        complaint.complaintId,
        summaryHtml +
          `<p style="font-size:13px;margin:12px 0 0">Customer: ${esc(contact.name)} · ${esc(contact.email)} · ${esc(contact.phone)}</p>` +
          `<p style="font-size:13px;margin:4px 0 0">Description: ${esc(defect.description)}</p>`,
      ),
    );
  }

  return { complaintId: complaint.complaintId };
}
