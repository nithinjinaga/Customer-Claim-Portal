"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { getSession, type Session } from "@/lib/auth";
import { sendEmail, statusUpdateEmail } from "@/lib/email";
import { STATUS_LABEL } from "@/components/ui";

const STATUSES = ["SUBMITTED", "CLAIM_ACCEPTED", "UNDER_REVIEW", "VIRTUAL_VERIFICATION", "SITE_VISIT", "ENGINEER_VISIT_SCHEDULE", "CLAIM_UNDER_PROCESS", "RESOLVED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];

async function requireStaff(): Promise<Session> {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER") throw new Error("Not authorized");
  return session;
}

/** Agents may only act on complaints assigned to them. */
async function getActionable(complaintId: string, session: Session) {
  const complaint = await db.complaint.findUnique({
    where: { complaintId },
    include: { user: true },
  });
  if (!complaint) throw new Error("Complaint not found");
  if (session.role === "AGENT" && complaint.assignedToId !== session.sub)
    throw new Error("Not authorized for this complaint");
  return complaint;
}

function refresh(complaintId: string) {
  revalidatePath(`/admin/complaint/${complaintId}`);
  revalidatePath("/admin");
}

export async function updateStatusAction(formData: FormData) {
  const session = await requireStaff();
  const complaintId = String(formData.get("complaintId"));
  const status = String(formData.get("status")) as Status;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  if (!STATUSES.includes(status)) throw new Error("Invalid status");

  const complaint = await getActionable(complaintId, session);
  if (complaint.status !== status || note) {
    await db.complaint.update({
      where: { id: complaint.id },
      data: {
        status,
        statusEvents: { create: { status, note, createdById: session.sub } },
      },
    });
    const email = complaint.user?.email ?? complaint.customerEmail;
    if (email) {
      // Notify after the response returns — don't block the status update on Resend.
      after(() =>
        sendEmail(
          email,
          `Update on complaint ${complaint.complaintId} · ${STATUS_LABEL[status]}`,
          statusUpdateEmail(
            complaint.user?.name ?? complaint.customerName ?? "Customer",
            complaint.complaintId,
            STATUS_LABEL[status],
            note,
          ),
        ),
      );
    }
  }
  refresh(complaintId);
}

export async function assignAction(formData: FormData) {
  const session = await requireStaff();
  if (session.role !== "ADMIN") throw new Error("Only admins can assign complaints");
  const complaintId = String(formData.get("complaintId"));
  const assignedToId = String(formData.get("assignedToId")) || null;

  const complaint = await getActionable(complaintId, session);
  await db.complaint.update({
    where: { id: complaint.id },
    data: { assignedToId },
  });
  refresh(complaintId);
}

export async function addNoteAction(formData: FormData) {
  const session = await requireStaff();
  const complaintId = String(formData.get("complaintId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const complaint = await getActionable(complaintId, session);
  await db.internalNote.create({
    data: { complaintId: complaint.id, authorId: session.sub, body },
  });
  refresh(complaintId);
}
