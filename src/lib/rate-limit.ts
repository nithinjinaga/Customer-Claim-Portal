import { createHash } from "node:crypto";
import { headers } from "next/headers";

// Salted hash of the client IP. Set IP_HASH_SALT in prod so hashes aren't guessable.
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return createHash("sha256")
    .update((process.env.IP_HASH_SALT ?? "pe-portal") + ip)
    .digest("hex");
}

// ponytail: in-memory fixed-window limiter — per-process, resets on restart.
// Fine for a single instance; move to Redis/DB if you run multiple instances.
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Returns true if allowed, false if the limit for this key is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}
