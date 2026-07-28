import { db } from "@/lib/db";
import { Card, StatusBadge, STATUS_LABEL, DEFECT_LABEL, Alert } from "@/components/ui";
import { IconCheck } from "@/components/icons";
import ComplaintDetail from "@/components/ComplaintDetail";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import TrackSearch from "./track-search";
import UnlockForm from "./unlock-form";

export const dynamic = "force-dynamic";

const STEPS = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"] as const;

// Unlock (email/phone second factor) throttle: 10 attempts per 10 minutes per IP.
const UNLOCK_LIMIT = 10;
const UNLOCK_WINDOW_MS = 10 * 60_000;

// Last 10 digits, ignoring +91 / spaces / dashes.
const normPhone = (p: string) => p.replace(/\D/g, "").slice(-10);

/** Does the supplied email-or-phone match this complaint's contact (snapshot or linked user)? */
function contactMatches(
  c: { customerEmail: string | null; customerPhone: string | null; user: { email: string; phone: string } | null },
  key: string,
): boolean {
  const k = key.trim().toLowerCase();
  if (!k) return false;
  const emails = [c.customerEmail, c.user?.email].filter(Boolean).map((e) => e!.toLowerCase());
  if (emails.includes(k)) return true;
  const kp = normPhone(k);
  if (kp.length === 10) {
    const phones = [c.customerPhone, c.user?.phone].filter(Boolean).map((p) => normPhone(p!));
    if (phones.includes(kp)) return true;
  }
  return false;
}

/** Horizontal step tracker (Submitted → Under Review → In Progress → Resolved). */
function StatusStepper({ status }: { status: string }) {
  const reachedIdx = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="mt-7 flex items-start">
      {STEPS.map((step, i) => {
        const isDone = i <= reachedIdx;
        const isNext = i === reachedIdx + 1;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`tnum flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-semibold ${
                  isDone
                    ? "bg-pe-green text-white"
                    : isNext
                      ? "border-2 border-pe-blue bg-card text-pe-navy ring-4 ring-pe-blue/20"
                      : "border border-input bg-surface text-muted"
                }`}
              >
                {isDone ? <IconCheck className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`mt-2 w-16 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide ${
                  isDone || isNext ? "text-pe-navy" : "text-muted"
                }`}
              >
                {STATUS_LABEL[step]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1.5 mt-4 h-0.5 flex-1 rounded ${i < reachedIdx ? "bg-pe-green" : "bg-line"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; k?: string }>;
}) {
  const { id, k } = await searchParams;
  const complaintId = id?.trim().toUpperCase();
  const complaint = complaintId
    ? await db.complaint.findUnique({
        where: { complaintId },
        include: {
          attachments: true,
          statusEvents: { orderBy: { createdAt: "asc" } },
          user: { select: { email: true, phone: true } },
        },
      })
    : null;

  // Throttle unlock attempts per IP (complaint IDs are guessable; this blocks
  // brute-forcing the email/phone second factor).
  const unlockBlocked = !!k && !rateLimit(`unlock:${await clientIpHash()}`, UNLOCK_LIMIT, UNLOCK_WINDOW_MS);
  const unlocked = !unlockBlocked && !!(complaint && k && contactMatches(complaint, k));

  return (
    <>
      <h1 className="text-2xl font-bold">Track a complaint</h1>
      <p className="mt-1 text-sm text-muted">
        Enter your Complaint ID to check the status of your after-sales request.
      </p>
      <TrackSearch defaultId={complaintId ?? ""} />

      {/* Sample preview — shown until the user searches; replaced by the real status card. */}
      {!complaintId && (
        <Card className="mt-6 border-dashed">
          <div className="flex flex-wrap items-center justify-between gap-3 opacity-60">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">Complaint</p>
              <p className="tnum text-lg font-bold text-muted">PE00000000</p>
            </div>
            <StatusBadge status="SUBMITTED" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm opacity-60">
            <div>
              <dt className="text-xs text-muted">Raised on</dt>
              <dd className="font-medium text-muted">—</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Defect type</dt>
              <dd className="font-medium text-muted">—</dd>
            </div>
          </dl>
          <div className="opacity-60">
            <StatusStepper status="SUBMITTED" />
          </div>
        </Card>
      )}

      {complaintId && !complaint && (
        <div className="mt-6">
          <Alert kind="error">
            No complaint found with ID <strong>{complaintId}</strong>. Check the
            ID in your confirmation email.
          </Alert>
        </div>
      )}

      {/* Unlocked: full details (contact second-factor matched). */}
      {complaint && unlocked && (
        <div className="mt-6">
          <ComplaintDetail complaint={complaint} />
        </div>
      )}

      {/* Locked: status-only summary + unlock form. */}
      {complaint && !unlocked && (
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
              <dd className="font-medium">{complaint.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Defect type</dt>
              <dd className="font-medium">
                {(complaint.defectTypes?.length ? complaint.defectTypes : [complaint.defectType])
                  .map((t) => DEFECT_LABEL[t] ?? t)
                  .join(", ")}
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
            <StatusStepper status={complaint.status} />
          )}

          <div className="mt-6 border-t border-line pt-4">
            <h2 className="text-sm font-semibold text-pe-navy">See full details &amp; evidence</h2>
            <p className="mt-1 text-xs text-muted">
              For your privacy, enter the email or mobile number you filed this complaint with.
            </p>
            {k && !unlocked && (
              <div className="mt-3">
                <Alert kind="error">
                  {unlockBlocked
                    ? "Too many attempts. Please wait a few minutes and try again."
                    : "Those details don't match this complaint. Please try again."}
                </Alert>
              </div>
            )}
            <UnlockForm complaintId={complaint.complaintId} />
          </div>
        </Card>
      )}
    </>
  );
}
