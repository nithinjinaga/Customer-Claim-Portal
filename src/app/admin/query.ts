import type { Prisma } from "@prisma/client";
import type { Session } from "@/lib/auth";

export type AdminFilters = {
  status?: string;
  defect?: string;
  from?: string;
  to?: string;
  q?: string;
};

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED", "REJECTED"];
const DEFECTS = ["TECHNICAL_FAULT", "TRANSIT_BREAKAGE"];

export function buildWhere(f: AdminFilters, session: Session): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = {};
  if (session.role === "AGENT") where.assignedToId = session.sub; // agents see assigned only
  if (f.status && STATUSES.includes(f.status)) where.status = f.status as never;
  if (f.defect && DEFECTS.includes(f.defect)) where.defectType = f.defect as never;
  if (f.from || f.to) {
    where.createdAt = {};
    if (f.from) where.createdAt.gte = new Date(f.from);
    if (f.to) where.createdAt.lte = new Date(`${f.to}T23:59:59`);
  }
  if (f.q) {
    where.OR = [
      { complaintId: { contains: f.q.trim(), mode: "insensitive" } },
      { user: { name: { contains: f.q.trim(), mode: "insensitive" } } },
      { user: { email: { contains: f.q.trim(), mode: "insensitive" } } },
    ];
  }
  return where;
}
