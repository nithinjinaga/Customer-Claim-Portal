import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Card, StatusBadge, btnGreen, btnGhost, Alert } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const complaints = await db.complaint.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    select: {
      complaintId: true,
      createdAt: true,
      defectType: true,
      status: true,
    },
  });

  const total = complaints.length;
  const open = complaints.filter((c) =>
    ["SUBMITTED", "IN_PROGRESS"].includes(c.status),
  ).length;
  const review = complaints.filter((c) => c.status === "UNDER_REVIEW").length;
  const resolved = complaints.filter((c) => c.status === "RESOLVED").length;

  const tiles = [
    { label: "Total complaints", value: total, dot: "bg-pe-navy" },
    { label: "Open", value: open, dot: "bg-status-submitted" },
    { label: "Under review", value: review, dot: "bg-status-review" },
    { label: "Resolved", value: resolved, dot: "bg-status-resolved" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {submitted && (
        <Alert kind="success">
          Complaint <strong className="tnum">{submitted}</strong> submitted
          successfully. A confirmation email is on its way — our after-sales
          team will respond within 3 business days.
        </Alert>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {session.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Your Premier Energies complaints at a glance.
          </p>
        </div>
        <Link href="/dashboard/new-complaint" className={btnGreen}>
          + Raise New Complaint
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="!p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
              <span className={`h-2 w-2 rounded-full ${t.dot}`} aria-hidden />
              {t.label}
            </p>
            <p className="tnum mt-2 text-3xl font-bold text-ink">{t.value}</p>
          </Card>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold">Complaint history</h2>
        </div>
        {complaints.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <p className="text-sm text-muted">
              You haven&apos;t raised any complaints yet.
            </p>
            <Link href="/dashboard/new-complaint" className={btnGreen}>
              Raise your first complaint
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-6 py-3 font-semibold">Complaint ID</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Defect Type</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.complaintId} className="border-b border-line last:border-0 hover:bg-surface/60">
                    <td className="tnum px-6 py-3 font-semibold text-pe-navy">{c.complaintId}</td>
                    <td className="px-6 py-3">{c.createdAt.toLocaleDateString("en-IN")}</td>
                    <td className="px-6 py-3">
                      {c.defectType === "TECHNICAL_FAULT" ? "Technical Fault" : "Transit Breakage"}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/dashboard/complaint/${c.complaintId}`}
                        className={`${btnGhost} !px-3 !py-1.5 !text-xs`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
