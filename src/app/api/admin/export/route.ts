import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildWhere, type AdminFilters } from "@/app/admin/query";

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR leading chars).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const filters: AdminFilters = {
    status: sp.get("status") ?? undefined,
    defect: sp.get("defect") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    q: sp.get("q") ?? undefined,
  };

  const complaints = await db.complaint.findMany({
    where: buildWhere(filters, session),
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true, company: true, customerType: true } },
      assignedTo: { select: { name: true } },
    },
  });

  const header = [
    "Complaint ID", "Date", "Status", "Customer", "Email", "Phone", "Company",
    "Customer Type", "Defect Type", "Site Address", "Capacity (KWp)", "Grid Type",
    "Commissioned", "Invoice No", "Module Model", "Wp Rating", "Defective Qty",
    "Serial Numbers", "Description", "Assigned To",
  ];
  const rows = complaints.map((c) =>
    [
      c.complaintId,
      c.createdAt.toISOString().slice(0, 10),
      c.status,
      c.user?.name ?? c.customerName,
      c.user?.email ?? c.customerEmail,
      c.user?.phone ?? c.customerPhone,
      c.user?.company ?? "",
      c.user?.customerType ?? "",
      c.defectType,
      c.siteAddress,
      c.siteCapacityKwp,
      c.gridType,
      c.commissionedDate ? c.commissionedDate.toISOString().slice(0, 10) : "",
      c.invoiceNumber,
      c.moduleModel,
      c.wpRating,
      c.defectiveQty,
      c.serialNumbers.join("; "),
      c.description,
      c.assignedTo?.name,
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="complaints-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
