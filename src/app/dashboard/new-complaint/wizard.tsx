"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { siteSchema, modulesSchema, defectSchema } from "@/lib/validation";
import { submitComplaint } from "./actions";
import { Field, inputCls, btnPrimary, btnGreen, btnGhost, Card, Alert } from "@/components/ui";
import { EvidenceUpload, InvoiceUpload, type AttachmentMeta } from "./uploads";

const DRAFT_KEY = "pe-complaint-draft";
const STEPS = ["Site Details", "Module Details", "Defect Report", "Evidence", "Review & Submit"];

type Draft = {
  step: number;
  site?: Record<string, unknown>;
  modules?: { serialNumbers: string[]; moduleModel?: string; wpRating?: number; defectiveQty?: number };
  defect?: Record<string, unknown>;
  invoice: AttachmentMeta | null;
  evidence: AttachmentMeta[];
};

const emptyDraft: Draft = { step: 0, invoice: null, evidence: [] };

const toDateInput = (v: unknown) =>
  v ? new Date(v as string).toISOString().slice(0, 10) : "";

function RadioRow({
  options,
  ...reg
}: {
  options: [string, string][];
} & ReturnType<ReturnType<typeof useForm>["register"]>) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map(([value, label]) => (
        <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="radio" value={value} {...reg} className="h-4 w-4 accent-pe-blue" />
          {label}
        </label>
      ))}
    </div>
  );
}

export default function Wizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [restored, setRestored] = useState(false);
  const [storageOn, setStorageOn] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...emptyDraft, ...JSON.parse(raw) });
    } catch {}
    setRestored(true);
    fetch("/api/upload-url")
      .then((r) => r.json())
      .then((j) => setStorageOn(!!j.configured))
      .catch(() => setStorageOn(false));
  }, []);

  useEffect(() => {
    if (restored) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, restored]);

  if (!restored) return null;
  const step = draft.step;
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Raise a complaint</h1>

      <ol className="mt-6 flex items-center">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && patch({ step: i })}
              className="flex flex-col items-center disabled:cursor-not-allowed"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < step
                    ? "bg-pe-green text-white"
                    : i === step
                      ? "bg-pe-blue text-white ring-4 ring-pe-blue/20"
                      : "border border-line bg-card text-muted"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span
                className={`mt-1.5 hidden w-20 text-center text-[10px] font-medium leading-tight sm:block ${
                  i === step ? "text-pe-blue" : "text-muted"
                }`}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 sm:mb-5 ${i < step ? "bg-pe-green" : "bg-line"}`} />
            )}
          </li>
        ))}
      </ol>

      <Card className="mt-6">
        {step === 0 && <SiteStep draft={draft} patch={patch} />}
        {step === 1 && <ModulesStep draft={draft} patch={patch} />}
        {step === 2 && <DefectStep draft={draft} patch={patch} />}
        {step === 3 && <EvidenceStep draft={draft} patch={patch} storageOn={storageOn} />}
        {step === 4 && (
          <ReviewStep
            draft={draft}
            patch={patch}
            storageOn={storageOn}
            onDone={(id) => {
              localStorage.removeItem(DRAFT_KEY);
              router.push(`/dashboard?submitted=${encodeURIComponent(id)}`);
            }}
          />
        )}
      </Card>
    </div>
  );
}

function StepNav({ onBack, nextLabel = "Next" }: { onBack?: () => void; nextLabel?: string }) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
      {onBack ? (
        <button type="button" onClick={onBack} className={btnGhost}>
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button type="submit" className={btnPrimary}>
        {nextLabel} →
      </button>
    </div>
  );
}

function SiteStep({ draft, patch }: { draft: Draft; patch: (p: Partial<Draft>) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof siteSchema>>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      ...draft.site,
      commissionedDate: toDateInput(draft.site?.commissionedDate),
    } as z.input<typeof siteSchema>,
  });

  return (
    <form
      onSubmit={handleSubmit((data) => patch({ site: data as Record<string, unknown>, step: 1 }))}
      className="grid gap-4 sm:grid-cols-2"
      noValidate
    >
      <div className="sm:col-span-2">
        <Field
          label="Site Location / Address"
          required
          error={errors.siteAddress?.message}
          hint="Where the modules are installed — can differ from your registered address"
        >
          <textarea className={inputCls} rows={2} {...register("siteAddress")} />
        </Field>
      </div>
      <Field label="Site Capacity (KWp)" required error={errors.siteCapacityKwp?.message}>
        <input className={`${inputCls} tnum`} type="number" step="any" min="0" {...register("siteCapacityKwp")} />
      </Field>
      <Field label="Grid Type" required error={errors.gridType?.message}>
        <RadioRow
          options={[
            ["ON_GRID", "ON Grid"],
            ["OFF_GRID", "OFF Grid"],
          ]}
          {...register("gridType")}
        />
      </Field>
      <Field label="Plant Commissioned Date" required error={errors.commissionedDate?.message}>
        <input className={inputCls} type="date" max={new Date().toISOString().slice(0, 10)} {...register("commissionedDate")} />
      </Field>
      <Field label="Invoice Number" required error={errors.invoiceNumber?.message}>
        <input className={inputCls} {...register("invoiceNumber")} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Invoice Copy" hint="PDF or image of your purchase invoice">
          <InvoiceUpload file={draft.invoice} onChange={(invoice) => patch({ invoice })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <StepNav />
      </div>
    </form>
  );
}

function ModulesStep({ draft, patch }: { draft: Draft; patch: (p: Partial<Draft>) => void }) {
  const [serials, setSerials] = useState<string[]>(draft.modules?.serialNumbers ?? [""]);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof modulesSchema>>({
    resolver: zodResolver(modulesSchema),
    defaultValues: { ...draft.modules, serialNumbers: serials } as z.input<typeof modulesSchema>,
  });

  const syncSerials = (next: string[]) => {
    setSerials(next);
    setValue("serialNumbers", next, { shouldValidate: false });
  };

  return (
    <form
      onSubmit={handleSubmit((data) =>
        patch({ modules: data as Draft["modules"], step: 2 }),
      )}
      className="grid gap-4 sm:grid-cols-2"
      noValidate
    >
      <div className="sm:col-span-2">
        <Field
          label="Module Serial Numbers"
          required
          error={
            (errors.serialNumbers as { message?: string } | undefined)?.message ??
            (Array.isArray(errors.serialNumbers)
              ? errors.serialNumbers.find(Boolean)?.message
              : undefined)
          }
          hint="Printed on the module label / laminate barcode"
        >
          <div className="flex flex-col gap-2">
            {serials.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={`${inputCls} tnum`}
                  value={s}
                  placeholder={`Serial number ${i + 1}`}
                  onChange={(e) =>
                    syncSerials(serials.map((x, j) => (j === i ? e.target.value : x)))
                  }
                />
                {serials.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove serial number ${i + 1}`}
                    onClick={() => syncSerials(serials.filter((_, j) => j !== i))}
                    className="rounded-card border border-line px-3 text-status-rejected hover:border-status-rejected"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => syncSerials([...serials, ""])}
              className="self-start text-sm font-medium text-pe-blue hover:underline"
            >
              + Add another serial number
            </button>
          </div>
        </Field>
      </div>
      <Field label="Module Model" error={errors.moduleModel?.message} hint="As printed on the module label (optional)">
        <input className={inputCls} {...register("moduleModel")} />
      </Field>
      <Field label="Wp Rating of Modules" required error={errors.wpRating?.message}>
        <input className={`${inputCls} tnum`} type="number" step="any" min="0" {...register("wpRating")} />
      </Field>
      <Field label="Quantity of Defective Modules" required error={errors.defectiveQty?.message}>
        <input className={`${inputCls} tnum`} type="number" min="1" step="1" {...register("defectiveQty")} />
      </Field>
      <div className="sm:col-span-2">
        <StepNav onBack={() => patch({ step: 0 })} />
      </div>
    </form>
  );
}

function DefectStep({ draft, patch }: { draft: Draft; patch: (p: Partial<Draft>) => void }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    // union schema vs flat form values — validated output is what matters
    resolver: zodResolver(defectSchema) as unknown as Resolver<Record<string, unknown>>,
    defaultValues: {
      defectType: "TECHNICAL_FAULT",
      ...draft.defect,
      defectNoticedDate: toDateInput(draft.defect?.defectNoticedDate),
      receivedDate: toDateInput(draft.defect?.receivedDate),
      technicianInspected: String(draft.defect?.technicianInspected ?? "false"),
    },
  });
  const defectType = watch("defectType");
  const inspected = watch("technicianInspected");
  const err = errors as Record<string, { message?: string } | undefined>;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={handleSubmit((data) => patch({ defect: data, step: 3 }))}
      className="grid gap-4"
      noValidate
    >
      <Field label="Defect Type" required error={err.defectType?.message}>
        <RadioRow
          options={[
            ["TECHNICAL_FAULT", "Technical Fault"],
            ["TRANSIT_BREAKAGE", "Transit Breakage"],
          ]}
          {...register("defectType")}
        />
      </Field>

      {defectType === "TRANSIT_BREAKAGE" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Material Received Date" required error={err.receivedDate?.message}>
            <input className={inputCls} type="date" max={today} {...register("receivedDate")} />
          </Field>
          <Field label="Mode of Delivery" required error={err.deliveryMode?.message}>
            <RadioRow
              options={[
                ["ON_ROAD", "On Road"],
                ["BY_AIR", "By Air"],
                ["BY_SEA", "By Sea"],
              ]}
              {...register("deliveryMode")}
            />
          </Field>
          <Field label="Vehicle Number" required error={err.vehicleNumber?.message}>
            <input className={inputCls} {...register("vehicleNumber")} />
          </Field>
          <Field label="Transporter Name / Details" required error={err.transporterName?.message}>
            <input className={inputCls} {...register("transporterName")} />
          </Field>
          <Field label="Mode of Unloading" required error={err.unloadingMode?.message}>
            <input className={inputCls} placeholder="e.g. Manual / Crane / Forklift" {...register("unloadingMode")} />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Description of Breakage"
              required
              error={err.description?.message}
              hint="Minimum 50 characters — what broke, how many modules, visible damage"
            >
              <textarea className={inputCls} rows={4} {...register("description")} />
            </Field>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="When was the defect first noticed?" required error={err.defectNoticedDate?.message}>
            <input className={inputCls} type="date" max={today} {...register("defectNoticedDate")} />
          </Field>
          <Field label="Inspected by a local technician?" required error={err.technicianInspected?.message}>
            <RadioRow
              options={[
                ["true", "Yes"],
                ["false", "No"],
              ]}
              {...register("technicianInspected")}
            />
          </Field>
          {String(inspected) === "true" && (
            <div className="sm:col-span-2">
              <Field label="Technician's findings" error={err.technicianFindings?.message}>
                <textarea className={inputCls} rows={3} {...register("technicianFindings")} />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field
              label="Description of Problem"
              required
              error={err.description?.message}
              hint="Minimum 50 characters — symptoms, error readings, affected output"
            >
              <textarea className={inputCls} rows={4} {...register("description")} />
            </Field>
          </div>
        </div>
      )}

      <StepNav onBack={() => patch({ step: 1 })} />
    </form>
  );
}

function EvidenceStep({
  draft,
  patch,
  storageOn,
}: {
  draft: Draft;
  patch: (p: Partial<Draft>) => void;
  storageOn: boolean | null;
}) {
  const [error, setError] = useState<string>();
  const hasImage = draft.evidence.some((f) => f.mimeType.startsWith("image/"));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (storageOn && !hasImage) {
          setError("Upload at least one image of the defect before continuing.");
          return;
        }
        patch({ step: 4 });
      }}
      className="grid gap-4"
    >
      <p className="text-sm text-muted">
        Upload photos of the defective modules (required) and videos if
        helpful. Clear close-ups of serial numbers and damage speed up
        assessment.
      </p>
      {error && <Alert kind="error">{error}</Alert>}
      <EvidenceUpload files={draft.evidence} onChange={(evidence) => patch({ evidence })} />
      <StepNav onBack={() => patch({ step: 2 })} />
    </form>
  );
}

const fmt = (v: unknown) => {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v))
    return new Date(v).toLocaleDateString("en-IN");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v).replaceAll("_", " ");
};

function ReviewStep({
  draft,
  patch,
  storageOn,
  onDone,
}: {
  draft: Draft;
  patch: (p: Partial<Draft>) => void;
  storageOn: boolean | null;
  onDone: (complaintId: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const sections: [string, number, [string, unknown][]][] = [
    [
      "Site details",
      0,
      [
        ["Site address", draft.site?.siteAddress],
        ["Capacity (KWp)", draft.site?.siteCapacityKwp],
        ["Grid type", draft.site?.gridType],
        ["Commissioned", draft.site?.commissionedDate],
        ["Invoice number", draft.site?.invoiceNumber],
        ["Invoice copy", draft.invoice?.originalName ?? "Not uploaded"],
      ],
    ],
    [
      "Module details",
      1,
      [
        ["Serial numbers", draft.modules?.serialNumbers?.join(", ")],
        ["Module model", draft.modules?.moduleModel],
        ["Wp rating", draft.modules?.wpRating],
        ["Defective quantity", draft.modules?.defectiveQty],
      ],
    ],
    [
      "Defect report",
      2,
      Object.entries(draft.defect ?? {}).map(([k, v]) => [
        k
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()
          .replace(/^./, (c) => c.toUpperCase()),
        v,
      ]),
    ],
    [
      "Evidence",
      3,
      draft.evidence.length
        ? draft.evidence.map((f, i) => [`File ${i + 1}`, f.originalName] as [string, unknown])
        : [["Files", storageOn === false ? "Storage not configured" : "None"]],
    ],
  ];

  return (
    <div className="grid gap-5">
      {error && <Alert kind="error">{error}</Alert>}
      {sections.map(([title, stepIdx, rows]) => (
        <section key={title} className="rounded-card border border-line">
          <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
            <h2 className="text-sm font-semibold text-pe-navy">{title}</h2>
            <button
              type="button"
              onClick={() => patch({ step: stepIdx })}
              className="text-xs font-medium text-pe-blue hover:underline"
            >
              Edit
            </button>
          </header>
          <dl className="grid gap-x-6 gap-y-1.5 px-4 py-3 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 sm:block">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="break-words font-medium">{fmt(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-pe-green"
        />
        I confirm the information provided is accurate.
      </label>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <button type="button" onClick={() => patch({ step: 3 })} className={btnGhost}>
          ← Back
        </button>
        <button
          type="button"
          disabled={!confirmed || submitting}
          className={btnGreen}
          onClick={async () => {
            setSubmitting(true);
            setError(undefined);
            const res = await submitComplaint({
              site: draft.site,
              modules: draft.modules,
              defect: draft.defect,
              attachments: [
                ...(draft.invoice ? [draft.invoice] : []),
                ...draft.evidence,
              ],
            });
            if (res.error || !res.complaintId) {
              setError(res.error ?? "Something went wrong. Please try again.");
              setSubmitting(false);
              return;
            }
            onDone(res.complaintId);
          }}
        >
          {submitting ? "Submitting…" : "Submit complaint"}
        </button>
      </div>
    </div>
  );
}
