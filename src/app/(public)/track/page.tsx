import Link from "next/link";
import { db } from "@/lib/db";
import { Card, StatusBadge, STATUS_LABEL, inputCls, btnPrimary, Alert } from "@/components/ui";

export const dynamic = "force-dynamic";

const STEPS = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"] as const;

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const complaintId = id?.trim().toUpperCase();
  const complaint = complaintId
    ? await db.complaint.findUnique({
        where: { complaintId },
        include: { statusEvents: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Track a complaint</h1>
      <form action="/track" className="mt-4 flex gap-2">
        <input
          name="id"
          defaultValue={complaintId ?? ""}
          required
          placeholder="Complaint ID, e.g. PE1707202601"
          className={`${inputCls} tnum uppercase`}
          aria-label="Complaint ID"
        />
        <button type="submit" className={btnPrimary}>
          Track
        </button>
      </form>

      {complaintId && !complaint && (
        <div className="mt-6">
          <Alert kind="error">
            No complaint found with ID <strong>{complaintId}</strong>. Check the
            ID in your confirmation email.
          </Alert>
        </div>
      )}

      {complaint && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">Complaint</p>
              <p className="tnum text-lg font-bold text-pe-navy">{complaint.complaintId}</p>
            </div>
            <StatusBadge status={complaint.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Raised on</dt>
              <dd className="font-medium">{complaint.createdAt.toLocaleDateString("en-IN")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Defect type</dt>
              <dd className="font-medium">
                {complaint.defectType === "TECHNICAL_FAULT" ? "Technical Fault" : "Transit Breakage"}
              </dd>
            </div>
          </dl>

          {complaint.status === "REJECTED" ? (
            <div className="mt-5">
              <Alert kind="error">
                This complaint was rejected.
                {complaint.statusEvents.findLast((e) => e.status === "REJECTED")?.note && (
                  <> Reason: {complaint.statusEvents.findLast((e) => e.status === "REJECTED")!.note}</>
                )}
              </Alert>
            </div>
          ) : (
            <ol className="mt-6 flex items-center">
              {STEPS.map((step, i) => {
                const reachedIdx = STEPS.indexOf(complaint.status as (typeof STEPS)[number]);
                const done = i <= reachedIdx;
                return (
                  <li key={step} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          done ? "bg-pe-green text-white" : "border border-line bg-surface text-muted"
                        }`}
                      >
                        {done ? "✓" : i + 1}
                      </span>
                      <span className="mt-1.5 w-16 text-center text-[10px] font-medium leading-tight text-muted">
                        {STATUS_LABEL[step]}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`mx-1 mb-5 h-0.5 flex-1 ${i < reachedIdx ? "bg-pe-green" : "bg-line"}`} />
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
            For full details and evidence,{" "}
            <Link href="/login" className="font-medium text-pe-blue hover:underline">
              log in to your dashboard
            </Link>
            .
          </p>
        </Card>
      )}
    </div>
  );
}
