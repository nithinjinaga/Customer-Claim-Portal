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
      <span className="mb-1 block text-sm font-medium text-ink">
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
  "w-full rounded-card border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-pe-blue focus:outline-none focus:ring-2 focus:ring-pe-blue/20 disabled:bg-surface";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-card bg-pe-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-pe-blue-dark focus:outline-none focus:ring-2 focus:ring-pe-blue/40 disabled:opacity-50 disabled:cursor-not-allowed";

export const btnGreen =
  "inline-flex items-center justify-center gap-2 rounded-card bg-pe-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-pe-green-dark focus:outline-none focus:ring-2 focus:ring-pe-green/40 disabled:opacity-50 disabled:cursor-not-allowed";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-card border border-line bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:border-pe-blue hover:text-pe-blue focus:outline-none focus:ring-2 focus:ring-pe-blue/20";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-card p-6 shadow-sm ${className}`}>
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
  UNDER_REVIEW: "Under Review",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  const color = {
    SUBMITTED: "bg-blue-50 text-status-submitted border-status-submitted/30",
    UNDER_REVIEW: "bg-amber-50 text-status-review border-status-review/30",
    IN_PROGRESS: "bg-violet-50 text-status-progress border-status-progress/30",
    RESOLVED: "bg-green-50 text-status-resolved border-status-resolved/30",
    REJECTED: "bg-red-50 text-status-rejected border-status-rejected/30",
  }[status] ?? "bg-surface text-muted border-line";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${color}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
