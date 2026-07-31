import { type ReactNode } from "react";

export function Field({
  label,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-status-rejected"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-status-rejected">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-card border border-input bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 transition-colors focus:border-pe-blue focus:outline-none focus:ring-2 focus:ring-pe-blue/20 disabled:bg-surface disabled:text-muted";

// Green pill — primary call to action (redesign).
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-pe-green px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-pe-green-dark active:translate-y-px focus:outline-none focus:ring-2 focus:ring-pe-green/40 disabled:opacity-40 disabled:cursor-not-allowed";

export const btnGreen = btnPrimary;

// Outline pill — secondary action.
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-input bg-transparent px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-pe-navy transition-colors hover:border-pe-navy focus:outline-none focus:ring-2 focus:ring-pe-blue/30";

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`rounded-[28px] border border-line bg-card p-7 ${className}`}>
      {children}
    </div>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const cls = {
    error: "border-status-rejected/30 bg-red-50 text-status-rejected",
    success: "border-pe-green/40 bg-green-50 text-pe-green-dark",
    info: "border-pe-blue/30 bg-blue-50 text-pe-blue",
  }[kind];
  return <div className={`rounded-card border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  CLAIM_ACCEPTED: "Claim Accepted",
  UNDER_REVIEW: "Under Review",
  VIRTUAL_VERIFICATION: "Virtual Verification",
  SITE_VISIT: "Site Visit",
  ENGINEER_VISIT_SCHEDULE: "Engineer Visit Schedule",
  CLAIM_UNDER_PROCESS: "Claim Under Process",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

export const DEFECT_LABEL: Record<string, string> = {
  TECHNICAL_FAULT: "Technical Fault",
  TRANSIT_BREAKAGE: "Transit Breakage",
  VISUAL: "Visual",
  ELECTRICAL: "Electrical",
  MECHANICAL: "Mechanical",
};

export function StatusBadge({ status }: { status: string }) {
  const color = {
    SUBMITTED: "bg-blue-50 text-status-submitted border-status-submitted/30",
    CLAIM_ACCEPTED: "bg-teal-50 text-status-accepted border-status-accepted/30",
    UNDER_REVIEW: "bg-amber-50 text-status-review border-status-review/30",
    VIRTUAL_VERIFICATION: "bg-violet-50 text-status-virtual border-status-virtual/30",
    SITE_VISIT: "bg-orange-50 text-status-site border-status-site/30",
    ENGINEER_VISIT_SCHEDULE: "bg-sky-50 text-status-engineer border-status-engineer/30",
    CLAIM_UNDER_PROCESS: "bg-purple-50 text-status-process border-status-process/30",
    RESOLVED: "bg-green-50 text-status-resolved border-status-resolved/30",
    REJECTED: "bg-red-50 text-status-rejected border-status-rejected/30",
  }[status] ?? "bg-surface text-muted border-line";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
