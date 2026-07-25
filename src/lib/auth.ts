import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "pe_session";
const secret = () => {
  const s = process.env.JWT_SECRET;
  // Fail loudly rather than signing with the bytes of "undefined" (a known key).
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
};

export type Session = {
  sub: string;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
  name: string;
};

export async function signToken(payload: Session): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: Session) {
  const token = await signToken(session);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export const SESSION_COOKIE = COOKIE;
