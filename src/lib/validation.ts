import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^\+91[\s-]?/, "").replace(/\s/g, ""))
  .pipe(
    z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  );

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least 1 uppercase letter")
  .regex(/\d/, "At least 1 number");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// --- Complaint wizard ---

const pastDate = () =>
  z.coerce
    .date()
    .refine((d) => !isNaN(d.getTime()), "Enter a valid date")
    .refine((d) => d <= new Date(), "Cannot be in the future");

// Blank optional inputs arrive as "" — coerce would turn that into 0 / Invalid Date,
// so map empty → undefined before the inner schema runs.
const blankable = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), inner.optional());

const optInt = blankable(z.coerce.number().int().min(1, "At least 1"));
const optPastDate = blankable(pastDate());
const optString = blankable(z.string().trim().min(1).max(200, "Too long (max 200 characters)"));

// Who's filing — required for both anon and logged-in (prefilled) submissions.
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Your name is required").max(100, "Name is too long"),
  email: z.string().trim().toLowerCase().max(254, "Email is too long").email("Enter a valid email"),
  phone: phoneSchema,
  altPhone: z
    .union([z.literal(""), phoneSchema])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const siteSchema = z.object({
  projectName: optString,
  projectType: z.enum(["ROOFTOP", "GROUND_MOUNT", "FLOATING"], { error: "Select the project type" }),
  omBy: z.string().trim().min(1, "O&M by is required").max(200, "Too long"),
  siteAddress: z.string().trim().min(10, "Enter the full site address").max(300, "Address is too long"),
  siteCapacityAc: z.string().trim().min(1, "Enter the AC capacity").max(40, "Capacity is too long"),
  siteCapacityDc: z.string().trim().min(1, "Enter the DC capacity").max(40, "Capacity is too long"),
  gridType: blankable(z.enum(["ON_GRID", "OFF_GRID"])),
  commissionedDate: optPastDate,
  invoiceNumber: z.string().trim().min(2, "Invoice number is required").max(60, "Invoice number is too long"),
});

export const modulesSchema = z.object({
  serialNumbers: z
    .array(z.string().trim().min(3, "Serial number too short").max(64, "Serial number too long"))
    .min(1, "Add at least one serial number")
    .max(200, "Too many serial numbers"),
  moduleModel: z.string().trim().max(100, "Module model is too long").optional(),
  wpRating: z.coerce.number().positive("Enter the Wp rating"),
  defectiveQty: optInt,
});

// defectType + description are always required; transitSerialRef is required only
// for Transit Breakage (enforced by the refine below).
export const defectSchema = z
  .object({
    defectType: z.enum(["TECHNICAL_FAULT", "TRANSIT_BREAKAGE", "VISUAL", "ELECTRICAL", "MECHANICAL"]),
    description: z.string().trim().min(50, "Describe the problem in at least 50 characters").max(5000, "Description is too long (max 5000 characters)"),
    defectNoticedDate: optPastDate,
    technicianInspected: blankable(z.preprocess((v) => v === true || v === "true", z.boolean())),
    technicianFindings: z.string().trim().max(2000, "Findings too long (max 2000 characters)").optional(),
    receivedDate: optPastDate,
    deliveryMode: blankable(z.enum(["ON_ROAD", "BY_AIR", "BY_SEA"])),
    vehicleNumber: optString,
    transporterName: optString,
    unloadingMode: optString,
    transitSerialRef: optString,
  })
  .refine((d) => d.defectType !== "TRANSIT_BREAKAGE" || !!d.transitSerialRef, {
    path: ["transitSerialRef"],
    message: "Serial no of module is required",
  });

// Client-side upload constraints (also re-checked server-side in the upload route)
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
export const INVOICE_TYPES = ["application/pdf", ...IMAGE_TYPES];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_INVOICE_BYTES = 25 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 10;

const ALLOWED_MIME = new Set([...IMAGE_TYPES, ...VIDEO_TYPES, ...INVOICE_TYPES]);

// Storage keys we generate look like "anon/<uuid>-<safeName>": slash-separated
// [A-Za-z0-9._-] segments. Reject traversal ("..") / absolute paths / odd charsets
// so a client can't point an attachment at an arbitrary object in the bucket.
const storageKey = z
  .string()
  .min(1)
  .max(200)
  .regex(/^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._/-]*$/, "Invalid storage path");

// Attachment metadata is client-supplied (uploads go direct to storage), so every
// field is validated: mime against the allowlist, path against traversal, size
// capped, and the display name stripped of path separators / control chars.
const attachmentMeta = z.object({
  kind: z.enum(["INVOICE", "EVIDENCE"]),
  storagePath: storageKey,
  thumbPath: storageKey.optional(),
  mimeType: z.string().refine((m) => ALLOWED_MIME.has(m), "Unsupported file type"),
  sizeBytes: z.number().int().positive().max(MAX_VIDEO_BYTES),
  originalName: z
    .string()
    .min(1)
    .transform((s) => s.replace(/[/\\]/g, "_").replace(/[\x00-\x1f]/g, "").slice(0, 120))
    .pipe(z.string().min(1, "Invalid file name")),
});

export const attachmentsRelaxedSchema = z.array(attachmentMeta).max(11); // 10 evidence + 1 invoice

export const complaintSchema = z.object({
  contact: contactSchema,
  site: siteSchema,
  modules: modulesSchema,
  defect: defectSchema,
  attachments: attachmentsRelaxedSchema.refine(
    (a) => a.some((f) => f.kind === "EVIDENCE" && f.mimeType.startsWith("image/")),
    "At least one evidence image is required",
  ),
});

// Same shape minus attachments — attachments are managed as separate upload state
// in the client form, so the RHF resolver validates only the typed fields.
export const complaintFormSchema = z.object({
  contact: contactSchema,
  site: siteSchema,
  modules: modulesSchema,
  defect: defectSchema,
});

export type ComplaintInput = z.infer<typeof complaintSchema>;
