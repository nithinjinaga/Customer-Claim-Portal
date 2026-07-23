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
const optString = blankable(z.string().trim().min(1));

// Who's filing — required for both anon and logged-in (prefilled) submissions.
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Your name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema,
  altPhone: z
    .union([z.literal(""), phoneSchema])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const siteSchema = z.object({
  siteAddress: z.string().trim().min(10, "Enter the full site address"),
  siteCapacityKwp: z.coerce.number().positive("Enter the site capacity in KWp"),
  gridType: blankable(z.enum(["ON_GRID", "OFF_GRID"])),
  commissionedDate: optPastDate,
  invoiceNumber: z.string().trim().min(2, "Invoice number is required"),
});

export const modulesSchema = z.object({
  serialNumbers: z
    .array(z.string().trim().min(3, "Serial number too short"))
    .min(1, "Add at least one serial number"),
  moduleModel: z.string().trim().optional(),
  wpRating: z.coerce.number().positive("Enter the Wp rating"),
  defectiveQty: optInt,
});

// defectType + description are always required; transitSerialRef is required only
// for Transit Breakage (enforced by the refine below).
export const defectSchema = z
  .object({
    defectType: z.enum(["TECHNICAL_FAULT", "TRANSIT_BREAKAGE"]),
    description: z.string().trim().min(50, "Describe the problem in at least 50 characters"),
    defectNoticedDate: optPastDate,
    technicianInspected: blankable(z.preprocess((v) => v === true || v === "true", z.boolean())),
    technicianFindings: z.string().trim().optional(),
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

const attachmentMeta = z.object({
  kind: z.enum(["INVOICE", "EVIDENCE"]),
  storagePath: z.string().min(1),
  thumbPath: z.string().optional(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  originalName: z.string().min(1),
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

// Client-side upload constraints (also re-checked server-side)
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
export const INVOICE_TYPES = ["application/pdf", ...IMAGE_TYPES];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_INVOICE_BYTES = 25 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 10;
