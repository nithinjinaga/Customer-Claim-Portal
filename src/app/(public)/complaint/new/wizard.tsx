"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { complaintFormSchema } from "@/lib/validation";
import { submitComplaint } from "./actions";
import { Field, inputCls, btnGreen, btnGhost, Card, Alert } from "@/components/ui";
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
  IconTruck,
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
    site: { siteAddress: "", siteCapacityKwp: "", gridType: "", commissionedDate: "", invoiceNumber: "" },
    modules: { serialNumbers: [""], moduleModel: "", wpRating: "", defectiveQty: "" },
    defect: {
      defectType: "TECHNICAL_FAULT",
      description: "",
      defectNoticedDate: "",
      technicianInspected: "",
      technicianFindings: "",
      receivedDate: "",
      deliveryMode: "",
      vehicleNumber: "",
      transporterName: "",
      unloadingMode: "",
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
  const attachRef = useRef({ invoice, evidence });
  attachRef.current = { invoice, evidence };
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
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: getValues(), invoice, evidence }));
  }, [invoice, evidence, restored, done, getValues]);

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

  if (!restored) return null;
  if (done)
    return <SuccessStep done={done} />;

  const onSubmit = handleSubmit(async (data) => {
    if (storageOn && !evidence.some((f) => f.mimeType.startsWith("image/"))) {
      setFormError("Upload at least one photo of the defect before submitting.");
      document.getElementById("section-evidence")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setFormError(undefined);
    const attachments = [...(invoice ? [invoice] : []), ...evidence];
    const res = await submitComplaint({ ...data, attachments });
    if (res.error || !res.complaintId) {
      setFormError(res.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    const summary = buildSummary(res.complaintId, data, invoice, evidence);
    localStorage.removeItem(DRAFT_KEY);
    setDone({ id: res.complaintId, summary });
  });

  const defectType = watch("defect.defectType");
  const inspected = watch("defect.technicianInspected");
  const today = new Date().toISOString().slice(0, 10);

  const wv = watch();
  const done_: Record<SectionKey, boolean> = {
    contact: !!(wv.contact?.name?.trim() && wv.contact?.email?.trim() && wv.contact?.phone?.trim()),
    site: !!(wv.site?.siteAddress?.trim() && wv.site?.invoiceNumber?.trim()),
    modules: serials.some((x) => x.trim().length >= 3),
    defect: (wv.defect?.description ?? "").trim().length >= 50,
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
          </div>
        </Section>

        {/* 2 — Site details */}
        <Section id="site" step={2} Icon={IconMapPin} title="Site details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Site location / address" required error={errors.site?.siteAddress?.message}>
                <textarea className={inputCls} rows={2} {...register("site.siteAddress")} />
              </Field>
            </div>
            <Field label="Invoice number" required error={errors.site?.invoiceNumber?.message}>
              <input className={inputCls} {...register("site.invoiceNumber")} />
            </Field>
            <Field label="Site capacity (KWp)" error={errors.site?.siteCapacityKwp?.message}>
              <input className={`${inputCls} tnum`} type="number" step="any" min="0" {...register("site.siteCapacityKwp")} />
            </Field>
            <Field label="Grid type" error={errors.site?.gridType?.message}>
              <Segmented options={[["ON_GRID", "ON Grid"], ["OFF_GRID", "OFF Grid"]]} {...register("site.gridType")} />
            </Field>
            <Field label="Plant commissioned date" error={errors.site?.commissionedDate?.message}>
              <input className={inputCls} type="date" max={today} {...register("site.commissionedDate")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Invoice copy" hint="PDF or image of your purchase invoice">
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
            <Field label="Module model" error={errors.modules?.moduleModel?.message} hint="As printed on the label">
              <input className={inputCls} {...register("modules.moduleModel")} />
            </Field>
            <Field label="Wp rating of modules" error={errors.modules?.wpRating?.message}>
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
            <Field label="Type of defect" required error={errors.defect?.defectType?.message}>
              {DefectTypeCards(register("defect.defectType"))}
            </Field>

            {defectType === "TRANSIT_BREAKAGE" ? (
              <div className="grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-2">
                <Field label="Material received date" error={errors.defect?.receivedDate?.message}>
                  <input className={inputCls} type="date" max={today} {...register("defect.receivedDate")} />
                </Field>
                <Field label="Mode of delivery" error={errors.defect?.deliveryMode?.message}>
                  <Segmented options={[["ON_ROAD", "On Road"], ["BY_AIR", "By Air"], ["BY_SEA", "By Sea"]]} {...register("defect.deliveryMode")} />
                </Field>
                <Field label="Vehicle number" error={errors.defect?.vehicleNumber?.message}>
                  <input className={inputCls} {...register("defect.vehicleNumber")} />
                </Field>
                <Field label="Transporter name / details" error={errors.defect?.transporterName?.message}>
                  <input className={inputCls} {...register("defect.transporterName")} />
                </Field>
                <Field label="Mode of unloading" error={errors.defect?.unloadingMode?.message}>
                  <input className={inputCls} placeholder="e.g. Manual / Crane / Forklift" {...register("defect.unloadingMode")} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description of breakage" required error={errors.defect?.description?.message} hint="Minimum 50 characters: what broke, how many modules, visible damage">
                    <textarea className={inputCls} rows={4} {...register("defect.description")} />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-2">
                <Field label="When was the defect first noticed?" error={errors.defect?.defectNoticedDate?.message}>
                  <input className={inputCls} type="date" max={today} {...register("defect.defectNoticedDate")} />
                </Field>
                <Field label="Inspected by a local technician?" error={errors.defect?.technicianInspected?.message}>
                  <Segmented options={[["true", "Yes"], ["false", "No"]]} {...register("defect.technicianInspected")} />
                </Field>
                {String(inspected) === "true" && (
                  <div className="sm:col-span-2">
                    <Field label="Technician's findings" error={errors.defect?.technicianFindings?.message}>
                      <textarea className={inputCls} rows={3} {...register("defect.technicianFindings")} />
                    </Field>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Field label="Description of problem" required error={errors.defect?.description?.message} hint="Minimum 50 characters: symptoms, error readings, affected output">
                    <textarea className={inputCls} rows={4} {...register("defect.description")} />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* 5 — Evidence */}
        <Section id="evidence" step={5} Icon={IconCamera} title="Evidence">
          <p className="mb-3 text-sm text-muted">
            Upload clear photos of the defective modules. Close-ups of the damage and the
            serial-number labels speed up assessment. Videos are welcome if they help.
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
          <span className="block rounded-full border border-input bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-pe-green/60 peer-checked:border-pe-green peer-checked:bg-pe-green/10 peer-checked:text-pe-navy peer-focus-visible:ring-2 peer-focus-visible:ring-pe-green/30">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}

const DEFECT_CARDS = [
  { v: "TECHNICAL_FAULT", l: "Technical Fault", d: "Underperformance, hotspots, cell cracks, or electrical faults", Icon: IconWrench },
  { v: "TRANSIT_BREAKAGE", l: "Transit Breakage", d: "Physical damage that occurred during shipping or delivery", Icon: IconTruck },
] as const;

/** Large radio-cards for the primary defect-type choice. */
function DefectTypeCards(reg: Reg) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DEFECT_CARDS.map(({ v, l, d, Icon }) => (
        <label key={v} className="cursor-pointer">
          <input type="radio" value={v} {...reg} className="peer sr-only" />
          <span className="flex h-full items-start gap-3 rounded-2xl border border-line bg-card p-4 transition-colors hover:border-pe-green/50 peer-checked:border-pe-green peer-checked:bg-pe-green/5 peer-focus-visible:ring-2 peer-focus-visible:ring-pe-green/30">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pe-blue/10 text-pe-blue">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-pe-navy">{l}</span>
              <span className="mt-0.5 block text-xs text-muted">{d}</span>
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

const fmt = (v: unknown) => {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v).toLocaleDateString("en-IN");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v).replaceAll("_", " ");
};

function buildSummary(id: string, v: FormValues, invoice: AttachmentMeta | null, evidence: AttachmentMeta[]): string {
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
    line("Address", s.siteAddress),
    line("Capacity (KWp)", s.siteCapacityKwp),
    line("Grid type", s.gridType),
    line("Commissioned", s.commissionedDate),
    line("Invoice number", s.invoiceNumber),
    ``,
    `MODULES`,
    line("Serial numbers", (m.serialNumbers as string[] | undefined)?.filter(Boolean).join(", ")),
    line("Model", m.moduleModel),
    line("Wp rating", m.wpRating),
    line("Defective quantity", m.defectiveQty),
    ``,
    `DEFECT`,
    ...Object.entries(d).map(([k, val]) =>
      line(k.replace(/([A-Z])/g, " $1").replace(/^./, (ch) => ch.toUpperCase()), val),
    ),
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
