import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildWhere, type AdminFilters } from "../query";
import { Card, StatusBadge, STATUS_LABEL, DEFECT_LABEL, inputCls, btnPrimary, btnGhost } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<AdminFilters>;
}) {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER") redirect("/admin/login");
  const filters = await searchParams;

  const scope = buildWhere({}, session); // role scope only, for metrics
  const where = buildWhere(filters, session);

  const [byStatus, complaints, resolvedEvents] = await Promise.all([
    db.complaint.groupBy({ by: ["status"], where: scope, _count: true }),
    db.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    db.statusEvent.findMany({
      where: { status: "RESOLVED", complaint: { ...scope, status: "RESOLVED" } },
      include: { complaint: { select: { createdAt: true } } },
    }),
  ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const total = byStatus.reduce((n, b) => n + b._count, 0);
  const open = count("SUBMITTED") + count("UNDER_REVIEW") + count("IN_PROGRESS");
  // ponytail: avg over latest RESOLVED event per complaint, computed in JS — fine below ~10k rows
  const resolutionDays = new Map<number, number>();
  for (const e of resolvedEvents) {
    const days = (e.createdAt.getTime() - e.complaint.createdAt.getTime()) / 86400000;
    resolutionDays.set(e.complaintId, Math.max(resolutionDays.get(e.complaintId) ?? 0, days));
  }
  const avgDays =
    resolutionDays.size > 0
      ? [...resolutionDays.values()].reduce((a, b) => a + b, 0) / resolutionDays.size
      : null;

  const tiles = [
    { label: "Total tickets", value: String(total) },
    { label: "Open", value: String(open) },
    { label: "In progress", value: String(count("IN_PROGRESS")) },
    { label: "Resolved", value: String(count("RESOLVED")) },
    { label: "Avg resolution", value: avgDays === null ? "—" : `${avgDays.toFixed(1)} d` },
  ];

  const exportQs = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Complaints</h1>
        <a href={`/api/admin/export?${exportQs}`} className={btnGhost}>
          ⬇ Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} className="!p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{t.label}</p>
            <p className="tnum mt-1.5 text-2xl font-bold text-ink">{t.value}</p>
          </Card>
        ))}
      </div>

      <Card className="!p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto_auto]" method="GET">
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search ID, customer name, email…"
            className={inputCls}
          />
          <select name="status" defaultValue={filters.status ?? ""} className={inputCls}>
            <option value="">All status</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select name="defect" defaultValue={filters.defect ?? ""} className={inputCls}>
            <option value="">All defects</option>
            {Object.entries(DEFECT_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={inputCls} aria-label="From date" />
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={inputCls} aria-label="To date" />
          <button type="submit" className={btnPrimary}>
            Filter
          </button>
        </form>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Defect</th>
                <th className="px-4 py-3 font-semibold">Assigned</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {complaints.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    No complaints match these filters.
                  </td>
                </tr>
              )}
              {complaints.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/complaint/${c.complaintId}`}
                      className="tnum font-semibold text-pe-blue hover:underline"
                    >
                      {c.complaintId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.createdAt.toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.user?.name ?? c.customerName ?? "—"}</p>
                    <p className="text-xs text-muted">{c.user?.email ?? c.customerEmail ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {DEFECT_LABEL[c.defectType] ?? c.defectType}
                  </td>
                  <td className="px-4 py-3">{c.assignedTo?.name ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
