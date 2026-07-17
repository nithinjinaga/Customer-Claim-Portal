"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { complaintSchema, attachmentsRelaxedSchema } from "@/lib/validation";
import {
  sendEmail,
  complaintConfirmationEmail,
  internalNewComplaintEmail,
  esc,
} from "@/lib/email";
import { STATUS_LABEL } from "@/components/ui";

const MAX_PER_HOUR = 5;

function istDateKey() {
  // "DDMMYYYY" in Asia/Kolkata, independent of server timezone
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("day")}${get("month")}${get("year")}`;
}

export async function submitComplaint(
  raw: unknown,
): Promise<{ complaintId?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Session expired. Please log in again." };

  const recent = await db.complaint.count({
    where: { userId: session.sub, createdAt: { gt: new Date(Date.now() - 3600_000) } },
  });
  if (recent >= MAX_PER_HOUR) {
    return { error: "You have reached the limit of 5 complaints per hour. Please try again later." };
  }

  const storageConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = storageConfigured
    ? complaintSchema
    : // dev stub: storage off → attachments may be empty
      complaintSchema.extend({ attachments: attachmentsRelaxedSchema });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { site, modules, defect, attachments } = parsed.data;

  const dateKey = istDateKey();
  const complaint = await db.$transaction(async (tx) => {
    const counter = await tx.dailyCounter.upsert({
      where: { date: dateKey },
      create: { date: dateKey, counter: 1 },
      update: { counter: { increment: 1 } },
    });
    const complaintId = `PE${dateKey}${String(counter.counter).padStart(2, "0")}`;
    return tx.complaint.create({
      data: {
        complaintId,
        userId: session.sub,
        ...site,
        ...modules,
        ...defect,
        attachments: { create: attachments },
        statusEvents: { create: { status: "SUBMITTED" } },
      },
    });
  });

  const user = await db.user.findUnique({ where: { id: session.sub } });
  const defectLabel =
    defect.defectType === "TECHNICAL_FAULT" ? "Technical Fault" : "Transit Breakage";
  const summaryHtml = `<table style="width:100%;font-size:13px;line-height:1.8">
    <tr><td style="color:#5b6b7b">Defect type</td><td><strong>${defectLabel}</strong></td></tr>
    <tr><td style="color:#5b6b7b">Site</td><td>${esc(site.siteAddress)}</td></tr>
    <tr><td style="color:#5b6b7b">Capacity</td><td>${site.siteCapacityKwp} KWp</td></tr>
    <tr><td style="color:#5b6b7b">Defective modules</td><td>${modules.defectiveQty} × ${modules.wpRating} Wp</td></tr>
    <tr><td style="color:#5b6b7b">Serial numbers</td><td>${modules.serialNumbers.map(esc).join(", ")}</td></tr>
    <tr><td style="color:#5b6b7b">Status</td><td>${STATUS_LABEL[complaint.status]}</td></tr>
  </table>`;

  if (user) {
    await sendEmail(
      user.email,
      `Complaint ${complaint.complaintId} registered — Premier Energies`,
      complaintConfirmationEmail(user.name, complaint.complaintId, summaryHtml),
    );
    const internal = process.env.AFTER_SALES_EMAIL;
    if (internal) {
      await sendEmail(
        internal,
        `[New complaint] ${complaint.complaintId} — ${defectLabel} — ${user.name}`,
        internalNewComplaintEmail(
          complaint.complaintId,
          summaryHtml +
            `<p style="font-size:13px;margin:12px 0 0">Customer: ${esc(user.name)} · ${esc(user.email)} · ${esc(user.phone)}</p>` +
            `<p style="font-size:13px;margin:4px 0 0">Description: ${esc(defect.description)}</p>`,
        ),
      );
    }
  }

  return { complaintId: complaint.complaintId };
}
