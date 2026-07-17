// Creates/updates a staff user. Usage:
//   node scripts/seed-admin.mjs <email> <password> [name] [ADMIN|AGENT]
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, password, name = "After-Sales Admin", role = "ADMIN"] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/seed-admin.mjs <email> <password> [name] [ADMIN|AGENT]");
  process.exit(1);
}

const db = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 10);
const user = await db.user.upsert({
  where: { email: email.toLowerCase() },
  create: {
    email: email.toLowerCase(),
    name,
    role,
    passwordHash,
    phone: "9999999999",
    customerType: "COMMERCIAL",
  },
  update: { role, passwordHash, name },
});
console.log(`${user.role} user ready: ${user.email}`);
await db.$disconnect();
