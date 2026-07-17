import type { Attachment, Complaint, StatusEvent } from "@prisma/client";
import { Card, StatusBadge, STATUS_LABEL } from "@/components/ui";
import { getSignedUrl } from "@/lib/storage";
import Gallery, { type GalleryItem } from "@/components/Gallery";

const fmtSize = (b: number) =>
  b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const label = (v: string | null | undefined) => (v ? v.replaceAll("_", " ") : "—");

async function toGalleryItems(attachments: Attachment[]): Promise<GalleryItem[]> {
  const storageOn = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Promise.all(
    attachments.map(async (a) => {
      let url: string | null = null;
      let thumbUrl: string | null = null;
      if (storageOn) {
        try {
          url = await getSignedUrl(a.storagePath);
          if (a.thumbPath) thumbUrl = await getSignedUrl(a.thumbPath);
        } catch {
          // file missing or storage error — fall back to name-only tile
        }
      }
      return {
        url,
        thumbUrl,
        isImage: a.mimeType.startsWith("image/") || a.mimeType === "application/pdf",
        name: a.originalName,
        size: fmtSize(a.sizeBytes),
      };
    }),
  );
}

function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="break-words font-medium">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ComplaintDetail({
  complaint,
}: {
  complaint: Complaint & { attachments: Attachment[]; statusEvents: StatusEvent[] };
}) {
  const c = complaint;
  const invoice = c.attachments.filter((a) => a.kind === "INVOICE");
  const evidence = c.attachments.filter((a) => a.kind === "EVIDENCE");
  const [invoiceItems, evidenceItems] = await Promise.all([
    toGalleryItems(invoice),
    toGalleryItems(evidence),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Complaint</p>
            <h1 className="tnum text-xl font-bold">{c.complaintId}</h1>
            <p className="mt-0.5 text-xs text-muted">Raised on {fmtDate(c.createdAt)}</p>
          </div>
          <StatusBadge status={c.status} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-pe-navy">Status timeline</h2>
        <ol className="relative ml-2 border-l-2 border-line pl-5">
          {c.statusEvents.map((e, i) => {
            const last = i === c.statusEvents.length - 1;
            return (
              <li key={e.id} className="relative pb-4 last:pb-0">
                <span
                  className={`absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${
                    last
                      ? e.status === "REJECTED"
                        ? "bg-status-rejected"
                        : "bg-pe-green"
                      : "bg-line"
                  }`}
                />
                <p className="text-sm font-semibold">{STATUS_LABEL[e.status]}</p>
                <p className="text-xs text-muted">
                  {e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                {e.note && <p className="mt-1 text-sm text-ink">{e.note}</p>}
              </li>
            );
          })}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-pe-navy">Site details</h2>
        <Rows
          rows={[
            ["Site address", c.siteAddress],
            ["Site capacity", `${c.siteCapacityKwp} KWp`],
            ["Grid type", label(c.gridType)],
            ["Plant commissioned", fmtDate(c.commissionedDate)],
            ["Invoice number", c.invoiceNumber],
          ]}
        />
        {invoiceItems.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted">Invoice copy</p>
            <Gallery items={invoiceItems} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-pe-navy">Module details</h2>
        <Rows
          rows={[
            ["Serial numbers", <span key="s" className="tnum">{c.serialNumbers.join(", ")}</span>],
            ["Module model", c.moduleModel],
            ["Wp rating", `${c.wpRating} Wp`],
            ["Defective quantity", String(c.defectiveQty)],
          ]}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-pe-navy">
          Defect report — {c.defectType === "TECHNICAL_FAULT" ? "Technical Fault" : "Transit Breakage"}
        </h2>
        <Rows
          rows={
            c.defectType === "TECHNICAL_FAULT"
              ? [
                  ["Defect first noticed", fmtDate(c.defectNoticedDate)],
                  ["Inspected by technician", c.technicianInspected ? "Yes" : "No"],
                  ...(c.technicianInspected
                    ? ([["Technician's findings", c.technicianFindings]] as [string, React.ReactNode][])
                    : []),
                ]
              : [
                  ["Material received", fmtDate(c.receivedDate)],
                  ["Mode of delivery", label(c.deliveryMode)],
                  ["Vehicle number", c.vehicleNumber],
                  ["Transporter", c.transporterName],
                  ["Mode of unloading", c.unloadingMode],
                ]
          }
        />
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs text-muted">Description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{c.description}</p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-pe-navy">Evidence ({evidence.length})</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted">No evidence files attached.</p>
        ) : (
          <Gallery items={evidenceItems} />
        )}
      </Card>
    </div>
  );
}
