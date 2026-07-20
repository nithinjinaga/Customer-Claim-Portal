// End-to-end smoke test against a running dev server + local DB.
// Usage: node --env-file=.env scripts/e2e.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { nextComplaintId } from "../src/lib/complaint-id.ts";

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

// --- seed test data ---
const oldUsers = await db.user.findMany({
  where: { email: { in: ["e2e-customer@test.local", "e2e-other@test.local"] } },
});
if (oldUsers.length) {
  const ids = oldUsers.map((u) => u.id);
  await db.complaint.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
}

const passwordHash = await bcrypt.hash("Customer@1", 10);
const customer = await db.user.create({
  data: {
    name: "E2E Customer", email: "e2e-customer@test.local", phone: "9876543210",
    customerType: "RESIDENTIAL", passwordHash,
    houseNo: "12-3", street: "MG Road", pincode: "500081",
    state: "Telangana", district: "Hyderabad", city: "Hyderabad",
  },
});
const other = await db.user.create({
  data: {
    name: "E2E Other", email: "e2e-other@test.local", phone: "9876543211",
    customerType: "COMMERCIAL", passwordHash,
  },
});
const admin = await db.user.findUnique({ where: { email: "admin@premierenergies.com" } });
const agent = await db.user.findUnique({ where: { email: "agent@premierenergies.com" } });

// --- complaint ID sequencing through the real generator ---
const id1 = await db.$transaction(nextComplaintId);
const id2 = await db.$transaction(nextComplaintId);
check("complaint ID format PEDDMMYYYYNN", /^PE\d{10,}$/.test(id1), id1);
check(
  "daily sequence increments",
  parseInt(id2.slice(10), 10) === parseInt(id1.slice(10), 10) + 1,
  `${id1} -> ${id2}`,
);

const base = {
  userId: customer.id,
  siteAddress: "Plot 42, Solar Park, Shamshabad, Hyderabad 501218",
  siteCapacityKwp: 12.5, gridType: "ON_GRID",
  commissionedDate: new Date("2025-11-20"), invoiceNumber: "INV-7788",
  serialNumbers: ["PE23A00112233", "PE23A00112234"], wpRating: 545, defectiveQty: 2,
  statusEvents: { create: { status: "SUBMITTED" } },
};
const c1 = await db.complaint.create({
  data: {
    ...base, complaintId: id1, defectType: "TECHNICAL_FAULT",
    description: "Two modules show severe power degradation and visible hotspot browning near the junction box area.",
    defectNoticedDate: new Date("2026-07-01"), technicianInspected: true,
    technicianFindings: "Bypass diode failure suspected on both modules.",
  },
});
await db.complaint.create({
  data: {
    ...base, complaintId: id2, defectType: "TRANSIT_BREAKAGE",
    description: "Glass shattered on two modules on arrival; pallet corner crushed during road transport unloading.",
    receivedDate: new Date("2026-07-10"), deliveryMode: "ON_ROAD",
    vehicleNumber: "TS09AB1234", transporterName: "SafeHaul Logistics", unloadingMode: "Manual",
  },
});

const [custTok, otherTok, adminTok, agentTok] = await Promise.all(
  [customer, other, admin, agent].map(token),
);

// --- public pages ---
let r = await get("/");
check("landing 200 + title", r.status === 200 && r.body.includes("Customer Service Portal"));
r = await get(`/track?id=${id1}`);
check("public tracker finds complaint", r.status === 200 && r.body.includes(id1) && r.body.includes("Technical Fault"));
r = await get("/track?id=PE0101202099");
check("tracker handles unknown ID", r.body.includes("No complaint found"));
r = await get("/api/upload-url");
check("upload-url reports storage unconfigured", r.body.includes('"configured":false'));

// --- auth gating ---
r = await get("/dashboard");
check("middleware: /dashboard redirects to /login", r.status >= 300 && r.status < 400 && r.location.includes("/login"));
r = await get("/admin");
check("middleware: /admin redirects to /admin/login", r.status >= 300 && r.status < 400 && r.location.includes("/admin/login"));
r = await get("/admin", custTok);
check("customer cannot open /admin", r.status >= 300 && r.location.includes("/admin/login"));

// --- customer views ---
r = await get("/dashboard", custTok);
check("dashboard renders with counts + rows", r.status === 200 && r.body.includes("E2E Customer") && r.body.includes(id1));
r = await get(`/dashboard/complaint/${id1}`, custTok);
check("complaint detail renders", r.status === 200 && r.body.includes("PE23A00112233") && r.body.includes("Status timeline"));
r = await get(`/dashboard/complaint/${id1}`, otherTok);
check("other customer blocked from foreign complaint", r.status === 404);

// --- admin views ---
r = await get("/admin", adminTok);
check("admin list shows complaint + metrics", r.status === 200 && r.body.includes(id1) && r.body.includes("Total tickets"));
r = await get("/admin", agentTok);
check("agent sees no unassigned complaints", r.status === 200 && !r.body.includes(id1));
await db.complaint.update({ where: { id: c1.id }, data: { assignedToId: agent.id } });
r = await get("/admin", agentTok);
check("agent sees assigned complaint", r.status === 200 && r.body.includes(id1));
r = await get(`/admin/complaint/${id1}`, adminTok);
check("admin detail shows customer + controls", r.status === 200 && r.body.includes("e2e-customer@test.local") && r.body.includes("Update status"));
r = await get(`/admin/complaint/${id2}`, agentTok);
check("agent blocked from unassigned detail", r.status === 404);
r = await get("/api/admin/export?status=SUBMITTED", adminTok);
check("CSV export contains data", r.status === 200 && r.body.includes(id1) && r.body.includes("Complaint ID"));
r = await get("/api/admin/export");
check("CSV export requires staff", r.status === 401);
r = await get(`/api/admin/zip/${id1}`, adminTok);
check("ZIP route responds (503 storage off)", r.status === 503);

// --- status update side-effects (direct DB, mirrors updateStatusAction write) ---
await db.complaint.update({
  where: { id: c1.id },
  data: { status: "UNDER_REVIEW", statusEvents: { create: { status: "UNDER_REVIEW", note: "Assigned to QA team" } } },
});
r = await get(`/track?id=${id1}`);
check("tracker reflects status change", r.body.includes("Under Review"));
r = await get(`/dashboard/complaint/${id1}`, custTok);
check("timeline shows both events", r.body.includes("Assigned to QA team"));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
await db.$disconnect();
process.exit(failures ? 1 : 0);
