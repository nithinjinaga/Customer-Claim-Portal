"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { loginSchema, passwordSchema } from "@/lib/validation";
import { sendEmail, passwordResetEmail } from "@/lib/email";

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function loginAction(raw: unknown): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "Invalid email or password." };
  // Staff-only portal — customers file/track without accounts.
  if (user.role === "CUSTOMER") return { error: "Invalid email or password." };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Account locked after too many failed attempts. Try again in ${mins} min.` };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    await db.user.update({
      where: { id: user.id },
      data:
        attempts >= LOCKOUT_ATTEMPTS
          ? { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60000) }
          : { failedAttempts: attempts },
    });
    return { error: "Invalid email or password." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  await setSessionCookie({ sub: user.id, role: user.role, name: user.name });
  redirect("/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function forgotPasswordAction(email: string): Promise<{ ok: true }> {
  if (typeof email !== "string") return { ok: true }; // no enumeration on bad input
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 60 * 60000) },
    });
    await sendEmail(user.email, "Reset your portal password", passwordResetEmail(user.name, token));
  }
  return { ok: true }; // same response either way — no account enumeration
}

export async function resetPasswordAction(
  token: string,
  password: string,
): Promise<{ error?: string }> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const invalidLink = { error: "This reset link is invalid or has expired. Request a new one." };
  // Reset tokens are 64-char hex; reject anything else before hitting the DB.
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return invalidLink;

  const user = await db.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) return invalidLink;

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data, 10),
      resetToken: null,
      resetTokenExpiry: null,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
  redirect("/login?reset=1");
}
