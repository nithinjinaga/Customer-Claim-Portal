// End-to-end smoke test against a running dev server + live DB.
// Usage: node --env-file=.env scripts/e2e.mjs
// Note: the unlock/upload rate limiters are in-memory on the dev server, so
// re-running within ~10 min without a server restart can trip those checks.
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { nextComplaintId } from "../src/lib/complaint-id.ts";
import { complaintSchema } from "../src/lib/validation.ts";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const db = new PrismaClient();
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
}

const token = (user) =>
  new SignJWT({ sub: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

const get = async (path, cookie) => {
  const res = await fetch(BASE + path, {
    redirect: "manual",
    headers: cookie ? { cookie: `pe_session=${cookie}` } : {},
  });
  return { status: res.status, location: res.headers.get("location") ?? "", body: await res.text() };
};

// ===========================================================================
// 1. Validation schema — required fields + conditional transit rule
// ===========================================================================
const validInput = {
  contact: { name: "A B", email: "a@b.com", phone: "9876543210", altPhone: "" },
  site: { projectType: "ROOFTOP", omBy: "Self", siteAddress: "Plot 42, Solar Park, Shamshabad", siteCapacityAc: "10 KWp", siteCapacityDc: "12.5 KWp", gridType: "", commissionedDate: "2025-11-20", invoiceNumber: "INV-1" },
  modules: { serialNumbers: ["PE23A00112233"], wpRating: "545", defectiveQty: "" },
  defect: { description: "x".repeat(60), defectNoticedDate: "2026-07-01" },
  defects: [{ defectType: "VISUAL", description: "Visible browning on three modules" }],
  attachments: [
    { kind: "INVOICE", storagePath: "p/inv.pdf", mimeType: "application/pdf", sizeBytes: 100, originalName: "inv.pdf" },
    { kind: "EVIDENCE", storagePath: "p/x.jpg", mimeType: "image/jpeg", sizeBytes: 100, originalName: "e.jpg" },
  ],
};
const clone = (o) => structuredClone(o);
check("valid complaint passes schema", complaintSchema.safeParse(validInput).success);
{
  const bad = clone(validInput); bad.site.siteCapacityDc = "";
  check("site capacity required", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.modules.wpRating = "";
  check("Wp rating required", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.defects = [];
  check("at least one defect type required", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.defects[0].description = "short";
  check("per-defect description min length enforced", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.defect.defectNoticedDate = "";
  check("defect first-noticed date required", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.site.commissionedDate = "";
  check("commissioned date required", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.attachments = bad.attachments.filter((a) => a.kind !== "INVOICE");
  check("invoice attachment required", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.attachments = bad.attachments.filter((a) => a.kind !== "EVIDENCE");
  check("evidence image required", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.attachments[0].storagePath = "../../secret";
  check("attachment path traversal rejected", !complaintSchema.safeParse(bad).success);
}
{
  const bad = clone(validInput); bad.attachments[0].mimeType = "text/html";
  check("attachment disallowed mime rejected", !complaintSchema.safeParse(bad).success);
}

// ===========================================================================
// 2. Complaint ID generation + daily sequence
// ===========================================================================
const id1 = await db.$transaction(nextComplaintId);
const id2 = await db.$transaction(nextComplaintId);
const id3 = await db.$transaction(nextComplaintId);
check("complaint ID format PEDDMMYYNN", /^PE\d{8,}$/.test(id1), id1);
check("daily sequence increments", parseInt(id2.slice(8), 10) === parseInt(id1.slice(8), 10) + 1, `${id1} -> ${id2}`);

// ===========================================================================
// 3. Seed anonymous complaints (userId null + contact snapshot)
// ===========================================================================
const cleanup = () => db.complaint.deleteMany({ where: { complaintId: { in: [id1, id2, id3] } } });
await cleanup();

const base = {
  userId: null,
  customerName: "E2E Anon", customerEmail: "e2e-anon@test.local", customerPhone: "9876500001",
  siteAddress: "Plot 42, Solar Park, Shamshabad, Hyderabad 501218",
  siteCapacityAc: "10 KWp", siteCapacityDc: "12.5 KWp", gridType: "ON_GRID", commissionedDate: new Date("2025-11-20"),
  invoiceNumber: "INV-7788", serialNumbers: ["PE23A00112233", "PE23A00112234"],
  wpRating: 545, defectiveQty: 2,
  statusEvents: { create: { status: "SUBMITTED" } },
};
const c1 = await db.complaint.create({
  data: { ...base, complaintId: id1,
    defectType: "VISUAL", defectTypes: ["VISUAL", "ELECTRICAL"],
    defectDetails: { VISUAL: "Visible browning on three modules near the edge seal.", ELECTRICAL: "Hotspot and underperformance around the junction box." },
    description: "Two modules show severe power degradation and visible hotspot browning near the junction box.",
    defectNoticedDate: new Date("2026-07-01"), technicianInspected: true },
});
await db.complaint.create({
  data: { ...base, complaintId: id2,
    defectType: "MECHANICAL", defectTypes: ["MECHANICAL"],
    defectDetails: { MECHANICAL: "Glass shattered on two modules; frame corner bent." },
    description: "Glass shattered on two modules on arrival; visible cell cracks across the laminate.",
    defectNoticedDate: new Date("2026-07-10") },
});
// Formula-injection probe for the CSV export
await db.complaint.create({
  data: { ...base, complaintId: id3, customerName: "=SUM(9+9)",
    defectType: "VISUAL", defectTypes: ["VISUAL"], defectDetails: { VISUAL: "CSV probe" },
    description: "CSV formula-injection probe complaint, long enough to satisfy the minimum length rule." },
});

// CUSTOMER-role user (for the forged-token gating test) + staff lookups
await db.user.deleteMany({ where: { email: "e2e-customer@test.local" } });
const customer = await db.user.create({
  data: { name: "E2E Customer", email: "e2e-customer@test.local", phone: "9876500009",
    customerType: "RESIDENTIAL", passwordHash: "x" },
});
const admin = await db.user.findUnique({ where: { email: "admin@premierenergies.com" } });
const agent = await db.user.findUnique({ where: { email: "agent@premierenergies.com" } });
const [custTok, adminTok, agentTok] = await Promise.all([customer, admin, agent].map(token));

// ===========================================================================
// 4. Public pages + tracker (status-only, no PII without second factor)
// ===========================================================================
let r = await get("/");
check("landing 200 + tagline", r.status === 200 && r.body.includes("Customer Service Portal"));
r = await get(`/track?id=${id1}`);
check("tracker finds complaint (status only)", r.status === 200 && r.body.includes(id1) && r.body.includes("Visual"));
check("tracker hides PII until unlocked", !r.body.includes("e2e-anon@test.local") && !r.body.includes("PE23A00112233"));
r = await get("/track?id=PE01012099");
check("tracker handles unknown ID", r.body.includes("No complaint found"));
const storageOn = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
r = await get("/api/upload-url");
check("upload-url reports storage state", r.body.includes(`"configured":${storageOn}`));

// ===========================================================================
// 5. Track unlock (email/phone second factor)
// ===========================================================================
r = await get(`/track?id=${id1}&k=${encodeURIComponent("e2e-anon@test.local")}`);
check("unlock by email reveals full details", r.body.includes("Status timeline") && r.body.includes("PE23A00112233") && r.body.includes("Electrical"));
r = await get(`/track?id=${id1}&k=9876500001`);
check("unlock by phone reveals full details", r.body.includes("Status timeline") && r.body.includes("PE23A00112233"));
r = await get(`/track?id=${id1}&k=${encodeURIComponent("wrong@nope.com")}`);
check("wrong second factor stays locked", r.body.includes("don't match") && !r.body.includes("Status timeline"));

// ===========================================================================
// 6. Auth gating (removed routes + admin guard)
// ===========================================================================
for (const dead of ["/login", "/register", "/dashboard"]) {
  r = await get(dead);
  check(`removed route ${dead} -> 404`, r.status === 404);
}
r = await get("/admin");
check("middleware: /admin -> /admin/login", r.status >= 300 && r.status < 400 && r.location.includes("/admin/login"));
r = await get("/admin", custTok);
check("customer token cannot open /admin", r.status >= 300 && r.location.includes("/admin/login"));

// ===========================================================================
// 7. Admin views + exports + agent scoping
// ===========================================================================
r = await get("/admin", adminTok);
check("admin list shows complaint + metrics", r.status === 200 && r.body.includes(id1) && r.body.includes("Total tickets"));
r = await get("/admin", agentTok);
check("agent sees no unassigned complaints", r.status === 200 && !r.body.includes(id1));
await db.complaint.update({ where: { id: c1.id }, data: { assignedToId: agent.id } });
r = await get("/admin", agentTok);
check("agent sees assigned complaint", r.status === 200 && r.body.includes(id1));
r = await get(`/admin/complaint/${id1}`, adminTok);
check("admin detail shows PII + Status control, no Assignment",
  r.status === 200 && r.body.includes("e2e-anon@test.local") && r.body.includes("Update &amp; notify") && !r.body.includes(">Assignment<"));
r = await get(`/admin/complaint/${id2}`, adminTok);
check("admin detail renders defect report", r.status === 200 && r.body.includes("Mechanical"));
r = await get(`/admin/complaint/${id2}`, agentTok);
check("agent blocked from unassigned detail", r.status === 404);
r = await get("/api/admin/export?q=E2E", adminTok);
check("CSV export contains data", r.status === 200 && r.body.includes(id1) && r.body.includes("Complaint ID"));
check("CSV neutralizes formula injection", r.body.includes("'=SUM(9+9)") && !r.body.includes(",=SUM(9+9)"));
r = await get("/api/admin/export");
check("CSV export requires staff (401)", r.status === 401);
r = await get(`/api/admin/zip/${id1}`, adminTok);
check(storageOn ? "ZIP route 404 (no attachments)" : "ZIP route 503 (storage off)", r.status === (storageOn ? 404 : 503));
r = await get(`/api/admin/zip/${id1}`);
check("ZIP export requires staff (401)", r.status === 401);

// ===========================================================================
// 8. Status update side-effect (tracker reflects change)
// ===========================================================================
await db.complaint.update({
  where: { id: c1.id },
  data: { status: "UNDER_REVIEW", statusEvents: { create: { status: "UNDER_REVIEW", note: "Assigned to QA team" } } },
});
r = await get(`/track?id=${id1}`);
check("tracker reflects status change", r.body.includes("Under Review"));

// ===========================================================================
// 9. Rate limit — unlock throttle (fires last; exhausts the shared bucket)
// ===========================================================================
let blocked = false;
for (let i = 0; i < 12; i++) {
  r = await get(`/track?id=${id1}&k=nope${i}@x.com`);
  if (r.body.includes("Too many attempts")) { blocked = true; break; }
}
check("unlock rate limit blocks after repeated attempts", blocked);

// ===========================================================================
// cleanup
// ===========================================================================
await cleanup();
await db.user.deleteMany({ where: { email: "e2e-customer@test.local" } });

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
await db.$disconnect();
process.exit(failures ? 1 : 0);
