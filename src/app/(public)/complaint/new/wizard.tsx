"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { complaintFormSchema } from "@/lib/validation";
import { submitComplaint } from "./actions";
import { Field, inputCls, btnGreen, btnGhost, Card, Alert, DEFECT_LABEL } from "@/components/ui";
import { EvidenceUpload, InvoiceUpload, type AttachmentMeta } from "./uploads";
import {
  IconUser,
  IconMapPin,
  IconGrid,
  IconAlert,
  IconCamera,
  IconCheck,
  IconCheckCircle,
  IconWrench,
  IconImage,
  IconBolt,
  IconTrash,
  IconDownload,
  IconArrowRight,
} from "@/components/icons";

const DRAFT_KEY = "pe-complaint-draft";

const SECTIONS = [
  ["contact", "Customer details"],
  ["site", "Site"],
  ["modules", "Module"],
  ["defect", "Defect"],
  ["evidence", "Evidence"],
] as const;

type SectionKey = (typeof SECTIONS)[number][0];

const railDotCls = (isDone: boolean, isActive: boolean) => {
  const base =
    "tnum flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all group-hover:scale-110";
  if (isDone) return `${base} bg-pe-green text-white${isActive ? " ring-4 ring-pe-blue/20" : ""}`;
  if (isActive) return `${base} border-2 border-pe-blue bg-card text-pe-navy ring-4 ring-pe-blue/20`;
  return `${base} border border-input bg-surface text-muted`;
};

export type ContactDefaults = {
  name?: string;
  email?: string;
  phone?: string;
  altPhone?: string;
};

type DefectEntry = { defectType: string; description: string };

type FormValues = z.input<typeof complaintFormSchema>;
type Errs = ReturnType<typeof useForm<FormValues>>["formState"]["errors"];

const emptyValues = (contact?: ContactDefaults): FormValues =>
  ({
    contact: {
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      altPhone: contact?.altPhone ?? "",
    },
    site: {
      projectName: "",
      projectType: "",
      omBy: "",
      siteAddress: "",
      siteCapacityAc: "",
      siteCapacityDc: "",
      gridType: "",
      commissionedDate: "",
      invoiceNumber: "",
    },
    modules: { serialNumbers: [""], wpRating: "", defectiveQty: "" },
    defect: {
      description: "",
      defectNoticedDate: "",
      technicianInspected: "",
      technicianFindings: "",
    },
  }) as unknown as FormValues;

type Done = { id: string; summary: string };

export default function Wizard({
  defaultContact,
}: {
  defaultContact?: ContactDefaults;
}) {
  const [restored, setRestored] = useState(false);
  const [storageOn, setStorageOn] = useState<boolean | null>(null);
  const [invoice, setInvoice] = useState<AttachmentMeta | null>(null);
  const [evidence, setEvidence] = useState<AttachmentMeta[]>([]);
  const [defects, setDefects] = useState<DefectEntry[]>([]);
  const [defectError, setDefectError] = useState<string>();
  const [serials, setSerials] = useState<string[]>([""]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState<Done | null>(null);
  const [active, setActive] = useState<string>("contact");
  const [hovered, setHovered] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onTouched",
    resolver: zodResolver(complaintFormSchema),
    defaultValues: emptyValues(defaultContact),
  });

  // Keep latest attachments visible to the autosave subscription without re-subscribing.
  const attachRef = useRef({ invoice, evidence, defects });
  attachRef.current = { invoice, evidence, defects };
  const doneRef = useRef(false);
  doneRef.current = !!done;

  // Restore draft (client-only — no localStorage during SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.values) {
          reset(d.values);
          setSerials(d.values.modules?.serialNumbers?.length ? d.values.modules.serialNumbers : [""]);
        }
        if (d.invoice) setInvoice(d.invoice);
        if (Array.isArray(d.evidence)) setEvidence(d.evidence);
        if (Array.isArray(d.defects)) setDefects(d.defects);
      }
    } catch {}
    setRestored(true);
    fetch("/api/upload-url")
      .then((r) => r.json())
      .then((j) => setStorageOn(!!j.configured))
      .catch(() => setStorageOn(false));
  }, [reset]);

  // Autosave: form changes (no re-render) + attachment changes.
  useEffect(() => {
    if (!restored) return;
    const sub = watch((values) => {
      if (doneRef.current) return;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, ...attachRef.current }));
    });
    return () => sub.unsubscribe();
  }, [restored, watch]);
  useEffect(() => {
    if (!restored || done) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: getValues(), invoice, evidence, defects }));
  }, [invoice, evidence, defects, restored, done, getValues]);

  // Scrollspy: highlight the section the reader is currently in on the progress rail.
  useEffect(() => {
    if (!restored || done) return;
    const onScroll = () => {
      const y = window.scrollY + 180;
      let cur: SectionKey = SECTIONS[0][0];
      for (const [key] of SECTIONS) {
        const el = document.getElementById(`section-${key}`);
        if (el && el.offsetTop <= y) cur = key;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [restored, done]);

  const jumpTo = (key: string) => {
    const el = document.getElementById(`section-${key}`);
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: reduced ? "auto" : "smooth" });
  };

  const syncSerials = (next: string[]) => {
    setSerials(next);
    setValue("modules.serialNumbers", next, { shouldValidate: false });
  };

  const toggleDefect = (type: string) => {
    setDefectError(undefined);
    setDefects((prev) =>
      prev.some((e) => e.defectType === type)
        ? prev.filter((e) => e.defectType !== type)
        : [...prev, { defectType: type, description: "" }],
    );
  };
  const setDefectDescription = (type: string, description: string) =>
    setDefects((prev) => prev.map((e) => (e.defectType === type ? { ...e, description } : e)));

  if (!restored) return null;
  if (done)
    return <SuccessStep done={done} />;

  const onSubmit = handleSubmit(async (data) => {
    if (defects.length === 0) {
      setDefectError("Select at least one defect type");
      document.getElementById("section-defect")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (defects.some((d) => d.description.trim().length < 15)) {
      setDefectError("Add a description (at least 15 characters) for each selected defect");
      document.getElementById("section-defect")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setDefectError(undefined);
    if (storageOn && !invoice) {
      setFormError("Attach your invoice copy before submitting.");
      document.getElementById("section-site")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (storageOn && !evidence.some((f) => f.mimeType.startsWith("image/"))) {
      setFormError("Upload at least one photo of the defect before submitting.");
      document.getElementById("section-evidence")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setFormError(undefined);
    const attachments = [...(invoice ? [invoice] : []), ...evidence];
    const res = await submitComplaint({ ...data, attachments, defects });
    if (res.error || !res.complaintId) {
      setFormError(res.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    const summary = buildSummary(res.complaintId, data, invoice, evidence, defects);
    localStorage.removeItem(DRAFT_KEY);
    setDone({ id: res.complaintId, summary });
  });

  const inspected = watch("defect.technicianInspected");
  const today = new Date().toISOString().slice(0, 10);

  const wv = watch();
  const done_: Record<SectionKey, boolean> = {
    contact: !!(wv.contact?.name?.trim() && wv.contact?.email?.trim() && wv.contact?.phone?.trim()),
    site: !!(wv.site?.siteAddress?.trim() && wv.site?.invoiceNumber?.trim() && wv.site?.siteCapacityAc?.trim() && wv.site?.siteCapacityDc?.trim()),
    modules: serials.some((x) => x.trim().length >= 3) && !!String(wv.modules?.wpRating ?? "").trim(),
    defect: defects.length > 0 && (wv.defect?.description ?? "").trim().length >= 50,
    evidence: evidence.length > 0,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Fill in the details below to Raise a complaint.</h1>
        <p className="mt-1.5 text-sm text-muted">
          Fields marked <span className="text-status-rejected">*</span> are mandatory.
        </p>
      </header>

      {/* Big white card wrapping the rail + all section cards. */}
      <div className="mt-6 rounded-[28px] border border-line bg-card p-5 shadow-soft sm:p-7">

      {/* Progress rail — jump nav + live completion. Lives inside the big card now. */}
      <div className="border-b border-line pb-4">
        <div className="flex items-start">
          {SECTIONS.map(([key, label], i) => {
            const isDone = done_[key];
            const isActive = (hovered ?? active) === key;
            const last = i === SECTIONS.length - 1;
            return (
              <div key={key} className={`flex items-start ${last ? "" : "flex-1"}`}>
                <button
                  type="button"
                  onClick={() => jumpTo(key)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  className="group flex cursor-pointer flex-col items-center focus:outline-none"
                  aria-label={`Go to ${label}`}
                >
                  <span className={railDotCls(isDone, isActive)}>
                    {isDone ? <IconCheck className="h-4 w-4" /> : i + 1}
                  </span>
                  <span
                    className={`mt-1.5 hidden max-w-[74px] text-center text-[10px] uppercase leading-tight tracking-wide sm:block ${
                      isActive ? "font-semibold text-pe-navy" : isDone ? "font-medium text-pe-navy" : "font-medium text-muted"
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {!last && (
                  <span className={`mt-4 h-0.5 flex-1 rounded ${isDone ? "bg-pe-green" : "bg-line"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5 sm:px-6">
        {/* 1 — Your details */}
        <Section id="contact" step={1} Icon={IconUser} title="Customer details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.contact?.name?.message}>
              <input className={inputCls} autoComplete="name" {...register("contact.name")} />
            </Field>
            <Field label="Email" required error={errors.contact?.email?.message} hint="Your Complaint ID is emailed here">
              <input className={inputCls} type="email" autoComplete="email" {...register("contact.email")} />
            </Field>
            <Field label="Mobile number" required error={errors.contact?.phone?.message}>
              <input className={inputCls} type="tel" autoComplete="tel" placeholder="10-digit mobile" {...register("contact.phone")} />
            </Field>
            <Field label="Alternate number" error={errors.contact?.altPhone?.message}>
              <input className={inputCls} type="tel" {...register("contact.altPhone")} />
            </Field>
            <Field label="Project type" required error={errors.site?.projectType?.message}>
              <Segmented options={[["ROOFTOP", "Rooftop"], ["GROUND_MOUNT", "Ground Mount"], ["FLOATING", "Floating"]]} {...register("site.projectType")} />
            </Field>
            <Field label="O&M by" required error={errors.site?.omBy?.message} hint="Who handles operations & maintenance">
              <input className={inputCls} {...register("site.omBy")} />
            </Field>
          </div>
        </Section>

        {/* 2 — Site details */}
        <Section id="site" step={2} Icon={IconMapPin} title="Site details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Project name / Site name" error={errors.site?.projectName?.message}>
                <input className={inputCls} {...register("site.projectName")} />
              </Field>
            </div>
            <Field label="Site capacity (AC)" required error={errors.site?.siteCapacityAc?.message} hint="Include the unit, e.g. 10 KWp or 1.2 MWp">
              <input className={`${inputCls} tnum`} placeholder="e.g. 10 KWp" {...register("site.siteCapacityAc")} />
            </Field>
            <Field label="Site capacity (DC)" required error={errors.site?.siteCapacityDc?.message} hint="Include the unit, e.g. 12.5 KWp or 1.5 MWp">
              <input className={`${inputCls} tnum`} placeholder="e.g. 12.5 KWp" {...register("site.siteCapacityDc")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Site location / address" required error={errors.site?.siteAddress?.message}>
                <textarea className={inputCls} rows={2} {...register("site.siteAddress")} />
              </Field>
            </div>
            <Field label="Invoice number" required error={errors.site?.invoiceNumber?.message}>
              <input className={inputCls} {...register("site.invoiceNumber")} />
            </Field>
            <Field label="Grid type" error={errors.site?.gridType?.message}>
              <Segmented options={[["ON_GRID", "ON Grid"], ["OFF_GRID", "OFF Grid"]]} {...register("site.gridType")} />
            </Field>
            <Field label="Plant commissioned date" required error={errors.site?.commissionedDate?.message}>
              <input className={inputCls} type="date" max={today} {...register("site.commissionedDate")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Invoice copy" required hint="PDF or image of your purchase invoice">
                <InvoiceUpload file={invoice} onChange={setInvoice} />
              </Field>
            </div>
          </div>
        </Section>

        {/* 3 — Module details */}
        <Section id="modules" step={3} Icon={IconGrid} title="Module details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Module serial numbers"
                required
                error={serialError(errors)}
                hint="Printed on the module label / laminate barcode, one per affected module"
              >
                <div className="flex flex-col gap-2">
                  {serials.map((s, i) => {
                    const ok = s.trim().length >= 3;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="tnum w-6 shrink-0 text-center text-xs font-semibold text-muted">{i + 1}</span>
                        <div className="relative flex-1">
                          <input
                            className={`${inputCls} tnum ${ok ? "pr-9" : ""}`}
                            value={s}
                            placeholder="e.g. PE-1234-5678-ABCD"
                            aria-label={`Serial number ${i + 1}`}
                            onChange={(e) => syncSerials(serials.map((x, j) => (j === i ? e.target.value : x)))}
                          />
                          {ok && <IconCheck className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pe-green" />}
                        </div>
                        {serials.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove serial number ${i + 1}`}
                            onClick={() => syncSerials(serials.filter((_, j) => j !== i))}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input text-muted transition-colors hover:border-status-rejected hover:text-status-rejected"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => syncSerials([...serials, ""])}
                    className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-pe-blue/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-pe-blue transition-colors hover:bg-pe-blue/5"
                  >
                    <span className="text-base leading-none">+</span> Add another serial number
                  </button>
                </div>
              </Field>
            </div>
            <Field label="Module Wp rating" required error={errors.modules?.wpRating?.message}>
              <input className={`${inputCls} tnum`} type="number" step="any" min="0" {...register("modules.wpRating")} />
            </Field>
            <Field label="Quantity of defective modules" error={errors.modules?.defectiveQty?.message}>
              <input className={`${inputCls} tnum`} type="number" min="1" step="1" {...register("modules.defectiveQty")} />
            </Field>
          </div>
        </Section>

        {/* 4 — Defect report */}
        <Section id="defect" step={4} Icon={IconAlert} title="Defect report">
          <div className="grid gap-5">
            <div>
              <div className="mb-1.5 text-sm font-semibold text-ink">
                Type of defect <span className="text-status-rejected">*</span>
              </div>
              <p className="mb-2 text-xs text-muted">Select all that apply — click a type to open its description box.</p>
              <DefectTypeChecks selected={defects} onToggle={toggleDefect} onDescribe={setDefectDescription} />
              {defectError && <p className="mt-1 text-xs text-status-rejected">{defectError}</p>}
            </div>

            <div className="grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-2">
              <Field label="When was the defect first noticed?" required error={errors.defect?.defectNoticedDate?.message}>
                <input className={inputCls} type="date" max={today} {...register("defect.defectNoticedDate")} />
              </Field>
              <Field label="Inspected by EPC Team?" error={errors.defect?.technicianInspected?.message}>
                <Segmented options={[["true", "Yes"], ["false", "No"]]} {...register("defect.technicianInspected")} />
              </Field>
              {String(inspected) === "true" && (
                <div className="sm:col-span-2">
                  <Field label="EPC Team findings" error={errors.defect?.technicianFindings?.message}>
                    <textarea className={inputCls} rows={3} {...register("defect.technicianFindings")} />
                  </Field>
                </div>
              )}
              <div className="sm:col-span-2">
                <Field label="Describe the full problem in as much detail as possible" required error={errors.defect?.description?.message} hint="Minimum 50 characters: symptoms, error readings, affected output">
                  <textarea className={inputCls} rows={4} {...register("defect.description")} />
                </Field>
              </div>
            </div>
          </div>
        </Section>

        {/* 5 — Evidence */}
        <Section id="evidence" step={5} Icon={IconCamera} title="Evidence">
          <div className="mb-1.5 text-sm font-semibold text-ink">
            Photos of the defect <span className="text-status-rejected">*</span>
          </div>
          <p className="mb-3 text-xs text-muted">
            At least one photo required. Close-ups of the damage and serial-number
            labels speed up assessment. Videos welcome if they help.
          </p>
          <EvidenceUpload files={evidence} onChange={setEvidence} />
        </Section>

        {formError && <Alert kind="error">{formError}</Alert>}

        <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-surface px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-pe-green"
          />
          I confirm the information provided is accurate to the best of my knowledge.
        </label>

        <button type="submit" disabled={!confirmed || submitting} className={`${btnGreen} self-center px-10 shadow-lg shadow-pe-green/30 hover:!bg-pe-green hover:-translate-y-1.5 hover:shadow-xl hover:shadow-pe-green/40`}>
          {submitting ? "Submitting…" : "Submit complaint"}
        </button>
      </form>
      </div>
    </div>
  );
}

function serialError(errors: Errs): string | undefined {
  const e = errors.modules?.serialNumbers as
    | { message?: string }
    | ({ message?: string } | undefined)[]
    | undefined;
  if (!e) return undefined;
  if (Array.isArray(e)) return e.find(Boolean)?.message;
  return e.message;
}

function Section({
  id,
  step,
  Icon,
  title,
  children,
}: {
  id: string;
  step: number;
  Icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={`section-${id}`} className="scroll-mt-36">
      <div className="mb-5 flex items-center gap-3.5 border-b border-line pb-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pe-green/10 text-pe-green">
          <Icon className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Step {step}</span>
          <h2 className="text-2xl text-pe-navy">{title}</h2>
        </div>
      </div>
      {children}
    </Card>
  );
}

type Reg = ReturnType<ReturnType<typeof useForm>["register"]>;

/** Accessible segmented pill radios (native radios, visually styled). */
function Segmented({ options, ...reg }: { options: [string, string][] } & Reg) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <label key={value} className="cursor-pointer">
          <input type="radio" value={value} {...reg} className="peer sr-only" />
          <span className="block rounded-full border-2 border-input bg-card px-4 py-2 text-sm font-medium text-ink transition-all hover:border-pe-green/60 peer-checked:border-pe-green peer-checked:bg-pe-green peer-checked:text-white peer-checked:shadow-sm peer-checked:shadow-pe-green/30 peer-focus-visible:ring-2 peer-focus-visible:ring-pe-green/40">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}

const DEFECT_CARDS = [
  { v: "VISUAL", l: "Visual", d: "Discoloration, browning, snail trails, delamination, or other visible defects", Icon: IconImage },
  { v: "ELECTRICAL", l: "Electrical", d: "Underperformance, hotspots, connector or junction-box faults", Icon: IconBolt },
  { v: "MECHANICAL", l: "Mechanical", d: "Cell cracks, glass breakage, frame or structural damage", Icon: IconWrench },
] as const;

/** Multi-select defect cards; clicking a type opens a popover box (below the card) for its description. */
function DefectTypeChecks({
  selected,
  onToggle,
  onDescribe,
}: {
  selected: DefectEntry[];
  onToggle: (type: string) => void;
  onDescribe: (type: string, description: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {DEFECT_CARDS.map(({ v, l, d, Icon }) => {
        const entry = selected.find((e) => e.defectType === v);
        const ok = (entry?.description.trim().length ?? 0) >= 15;
        return (
          <div key={v} className="relative flex flex-col gap-1.5">
            <label className="relative block cursor-pointer">
              <input
                type="checkbox"
                checked={!!entry}
                onChange={() => {
                  const wasSelected = !!entry;
                  onToggle(v);
                  setOpen(wasSelected ? null : v);
                }}
                className="peer sr-only"
              />
              <span className="flex h-full items-start gap-3 rounded-2xl border-2 border-line bg-card p-4 pr-9 transition-all hover:border-pe-green/50 peer-checked:border-pe-green peer-checked:bg-pe-green/10 peer-checked:shadow-md peer-checked:shadow-pe-green/20 peer-focus-visible:ring-2 peer-focus-visible:ring-pe-green/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pe-blue/10 text-pe-blue">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-pe-navy">{l}</span>
                  <span className="mt-0.5 block text-xs text-muted">{d}</span>
                </span>
              </span>
              <span className="pointer-events-none absolute right-3 top-3 flex h-5 w-5 scale-50 items-center justify-center rounded-full bg-pe-green text-white opacity-0 transition-all peer-checked:scale-100 peer-checked:opacity-100">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
            </label>
            {entry && (
              <button
                type="button"
                onClick={() => setOpen(open === v ? null : v)}
                className={`self-start text-xs font-semibold ${ok ? "text-pe-green" : "text-status-rejected"}`}
              >
                {ok ? "✓ Description added — edit" : "+ Add description *"}
              </button>
            )}
            {open === v && entry && (
              <div className="absolute left-0 top-full z-20 mt-2 w-[min(86vw,320px)] rounded-2xl border border-line bg-card p-3 shadow-soft">
                <div className="text-xs font-semibold text-pe-navy">
                  Describe this {l} defect <span className="text-status-rejected">*</span>
                </div>
                <textarea
                  className={`${inputCls} mt-1.5`}
                  rows={3}
                  autoFocus
                  placeholder="What you see, how many modules, when it started…"
                  value={entry.description}
                  onChange={(e) => onDescribe(v, e.target.value)}
                />
                <p className="mt-1 text-xs text-muted">Minimum 15 characters.</p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    className="rounded-full bg-pe-green px-4 py-1.5 text-xs font-semibold text-white hover:bg-pe-green-dark"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const fmt = (v: unknown) => {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v).toLocaleDateString("en-IN");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v).replaceAll("_", " ");
};

function buildSummary(id: string, v: FormValues, invoice: AttachmentMeta | null, evidence: AttachmentMeta[], defects: DefectEntry[]): string {
  const c = v.contact as Record<string, unknown>;
  const s = v.site as Record<string, unknown>;
  const m = v.modules as Record<string, unknown>;
  const d = v.defect as Record<string, unknown>;
  const line = (k: string, val: unknown) => `${k}: ${fmt(val)}`;
  return [
    `Premier Energies · Complaint ${id}`,
    `Filed: ${new Date().toLocaleString("en-IN")}`,
    ``,
    `CONTACT`,
    line("Name", c.name),
    line("Email", c.email),
    line("Mobile", c.phone),
    line("Alternate", c.altPhone),
    ``,
    `SITE`,
    line("Project name", s.projectName),
    line("Project type", s.projectType),
    line("O&M by", s.omBy),
    line("Address", s.siteAddress),
    line("Capacity (AC)", s.siteCapacityAc),
    line("Capacity (DC)", s.siteCapacityDc),
    line("Grid type", s.gridType),
    line("Commissioned", s.commissionedDate),
    line("Invoice number", s.invoiceNumber),
    ``,
    `MODULES`,
    line("Serial numbers", (m.serialNumbers as string[] | undefined)?.filter(Boolean).join(", ")),
    line("Wp rating", m.wpRating),
    line("Defective quantity", m.defectiveQty),
    ``,
    `DEFECT`,
    ...defects.flatMap((x) => [
      `Type: ${DEFECT_LABEL[x.defectType] ?? x.defectType}`,
      `  ${x.description}`,
    ]),
    line("First noticed", d.defectNoticedDate),
    line("Inspected by EPC team", d.technicianInspected),
    line("EPC team findings", d.technicianFindings),
    line("Full problem description", d.description),
    ``,
    `Evidence files: ${evidence.length}${invoice ? " + 1 invoice" : ""}`,
  ].join("\n");
}

function SuccessStep({ done }: { done: Done }) {
  const { id, summary } = done;
  const download = () => {
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complaint-${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const timeline = [
    { title: "Complaint received", body: "We've logged your complaint and emailed you a copy.", now: true },
    { title: "Under review", body: "Our after-sales team responds within 3 business days.", now: false },
    { title: "Resolution", body: "We'll keep you posted on next steps and the outcome.", now: false },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pe-green/10 text-pe-green">
          <IconCheckCircle className="h-9 w-9" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Complaint registered</h1>
        <p className="mt-1 text-sm text-muted">
          A confirmation email is on its way to the address you provided.
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">Your complaint ID</p>
        <p className="tnum mt-1 text-2xl font-bold text-pe-navy">{id}</p>
        <p className="mx-auto mt-3 max-w-md text-xs text-muted">
          Save this ID. To see full details later, track it with this ID plus the email or
          mobile number you entered.
        </p>

        <div className="mt-8 text-left">
          <h2 className="text-sm font-semibold text-pe-navy">What happens next</h2>
          <ol className="mt-3">
            {timeline.map((t, i) => (
              <li key={t.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      t.now ? "bg-pe-green text-white" : "border border-line bg-card text-muted"
                    }`}
                  >
                    {t.now ? <IconCheck className="h-3.5 w-3.5" /> : <span className="tnum text-xs">{i + 1}</span>}
                  </span>
                  {i < timeline.length - 1 && <span className="my-1 w-0.5 flex-1 bg-line" />}
                </div>
                <div className="pb-5">
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-muted">{t.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={download} className={btnGhost}>
            <IconDownload className="h-4 w-4" />
            Download a copy
          </button>
          <Link href={`/track?id=${encodeURIComponent(id)}`} className={btnGreen}>
            Track this complaint
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
