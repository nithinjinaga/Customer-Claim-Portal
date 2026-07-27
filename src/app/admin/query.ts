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
const DEFECTS = ["TECHNICAL_FAULT", "TRANSIT_BREAKAGE", "VISUAL", "ELECTRICAL", "MECHANICAL"];

export function buildWhere(f: AdminFilters, session: Session): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = {};
  if (session.role === "AGENT") where.assignedToId = session.sub; // agents see assigned only
  if (f.status && STATUSES.includes(f.status)) where.status = f.status as never;
  if (f.defect && DEFECTS.includes(f.defect)) where.defectType = f.defect as never;
  // Ignore unparseable dates rather than passing an Invalid Date to Prisma.
  const from = f.from ? new Date(f.from) : null;
  const to = f.to ? new Date(`${f.to}T23:59:59`) : null;
  const validFrom = from && !isNaN(from.getTime()) ? from : null;
  const validTo = to && !isNaN(to.getTime()) ? to : null;
  if (validFrom || validTo) {
    where.createdAt = {};
    if (validFrom) where.createdAt.gte = validFrom;
    if (validTo) where.createdAt.lte = validTo;
  }
  if (f.q) {
    const q = f.q.trim();
    where.OR = [
      { complaintId: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}
