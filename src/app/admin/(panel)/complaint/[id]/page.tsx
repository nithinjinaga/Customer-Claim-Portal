import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ComplaintDetail from "@/components/ComplaintDetail";
import { updateStatusAction, addNoteAction } from "../../../actions";
import { Card, STATUS_LABEL, inputCls, btnPrimary, btnGhost } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminComplaintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER") redirect("/admin/login");
  const { id } = await params;

  const complaint = await db.complaint.findUnique({
    where: { complaintId: id.toUpperCase() },
    include: {
      user: true,
      assignedTo: { select: { id: true, name: true } },
      attachments: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      internalNotes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!complaint) notFound();
  if (session.role === "AGENT" && complaint.assignedToId !== session.sub) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <Link href="/admin" className="text-sm font-medium text-pe-blue hover:underline">
          ← All complaints
        </Link>
        <div className="mt-4">
          <ComplaintDetail complaint={complaint} />
        </div>
      </div>

      <aside className="flex flex-col gap-5 lg:pt-9">
        <Card>
          <h2 className="text-sm font-semibold text-pe-navy">
            Customer
          </h2>
          <dl className="mt-2 text-sm">
            <dd className="font-medium">{complaint.user?.name ?? complaint.customerName ?? "—"}</dd>
            <dd className="text-muted">{complaint.user?.email ?? complaint.customerEmail ?? "—"}</dd>
            <dd className="text-muted">{complaint.user?.phone ?? complaint.customerPhone ?? "—"}</dd>
            {complaint.customerAltPhone && !complaint.user && (
              <dd className="text-muted">{complaint.customerAltPhone} (alt)</dd>
            )}
            {complaint.user?.company && <dd className="text-muted">{complaint.user.company}</dd>}
            {complaint.user && (
              <dd className="mt-1 text-xs text-muted">
                {complaint.user.city}, {complaint.user.state} · {complaint.user.customerType.replaceAll("_", " ")}
              </dd>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-pe-navy">Status</h2>
          <form action={updateStatusAction} className="mt-3 grid gap-3">
            <input type="hidden" name="complaintId" value={complaint.complaintId} />
            <select name="status" defaultValue={complaint.status} className={inputCls}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <textarea
              name="note"
              rows={2}
              placeholder="Note to customer (optional, sent by email)"
              className={inputCls}
            />
            <button type="submit" className={btnPrimary}>
              Update &amp; notify customer
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-pe-navy">Evidence download</h2>
          <p className="mt-1 text-xs text-muted">
            All {complaint.attachments.length} file(s) as a single ZIP.
          </p>
          <a
            href={`/api/admin/zip/${complaint.complaintId}`}
            className={`${btnGhost} mt-3 w-full`}
          >
            ⬇ Download ZIP
          </a>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-pe-navy">
            Internal notes{" "}
            <span className="font-normal text-muted">(not visible to customer)</span>
          </h2>
          <form action={addNoteAction} className="mt-3 grid gap-2">
            <input type="hidden" name="complaintId" value={complaint.complaintId} />
            <textarea name="body" rows={2} required placeholder="Add a note…" className={inputCls} />
            <button type="submit" className={btnGhost}>
              Add note
            </button>
          </form>
          <ul className="mt-4 flex flex-col gap-3">
            {complaint.internalNotes.map((n) => (
              <li key={n.id} className="rounded-card bg-surface px-3 py-2 text-sm">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {n.author.name} ·{" "}
                  {n.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                </p>
              </li>
            ))}
            {complaint.internalNotes.length === 0 && (
              <li className="text-xs text-muted">No notes yet.</li>
            )}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
