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

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Full name is required"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: phoneSchema,
    altPhone: z
      .union([z.literal(""), phoneSchema])
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    company: z.string().trim().optional(),
    customerType: z.enum([
      "RESIDENTIAL",
      "COMMERCIAL",
      "INDUSTRIAL",
      "EPC",
      "CHANNEL_PARTNER",
    ]),
    houseNo: z.string().trim().min(1, "Required"),
    street: z.string().trim().min(1, "Required"),
    pincode: z.string().regex(/^\d{6}$/, "6-digit pincode"),
    state: z.string().trim().min(1, "Required"),
    district: z.string().trim().min(1, "Required"),
    city: z.string().trim().min(1, "Required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// --- Complaint wizard ---

export const siteSchema = z.object({
  siteAddress: z.string().trim().min(10, "Enter the full site address"),
  siteCapacityKwp: z.coerce.number().positive("Must be greater than 0"),
  gridType: z.enum(["ON_GRID", "OFF_GRID"]),
  commissionedDate: z.coerce.date().max(new Date(), "Cannot be in the future"),
  invoiceNumber: z.string().trim().min(2, "Invoice number is required"),
});

export const modulesSchema = z.object({
  serialNumbers: z
    .array(z.string().trim().min(3, "Serial number too short"))
    .min(1, "Add at least one serial number"),
  moduleModel: z.string().trim().optional(),
  wpRating: z.coerce.number().positive("Must be greater than 0"),
  defectiveQty: z.coerce.number().int().min(1, "At least 1"),
});

export const defectSchema = z.discriminatedUnion("defectType", [
  z.object({
    defectType: z.literal("TECHNICAL_FAULT"),
    description: z.string().trim().min(50, "Describe the problem in at least 50 characters"),
    defectNoticedDate: z.coerce.date().max(new Date(), "Cannot be in the future"),
    technicianInspected: z.coerce.boolean(),
    technicianFindings: z.string().trim().optional(),
  }),
  z.object({
    defectType: z.literal("TRANSIT_BREAKAGE"),
    description: z.string().trim().min(50, "Describe the breakage in at least 50 characters"),
    receivedDate: z.coerce.date().max(new Date(), "Cannot be in the future"),
    deliveryMode: z.enum(["ON_ROAD", "BY_AIR", "BY_SEA"]),
    vehicleNumber: z.string().trim().min(3, "Required"),
    transporterName: z.string().trim().min(2, "Required"),
    unloadingMode: z.string().trim().min(2, "Required"),
  }),
]);

const attachmentMeta = z.object({
  kind: z.enum(["INVOICE", "EVIDENCE"]),
  storagePath: z.string().min(1),
  thumbPath: z.string().optional(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  originalName: z.string().min(1),
});

export const complaintSchema = z.object({
  site: siteSchema,
  modules: modulesSchema,
  defect: defectSchema,
  attachments: z
    .array(attachmentMeta)
    .max(11) // 10 evidence + 1 invoice
    .refine(
      (a) => a.some((f) => f.kind === "EVIDENCE" && f.mimeType.startsWith("image/")),
      "At least one evidence image is required",
    ),
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
