import { createHash } from "node:crypto";
import { headers } from "next/headers";

// Salted hash of the client IP. Set IP_HASH_SALT in prod so hashes aren't guessable.
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  // Prefer the proxy's forwarded client IP, then x-real-ip. When neither is set
  // (local dev, or a request path with no proxy) every caller collapses into one
  // shared bucket — that over-throttles rather than skipping the limit (fail-closed).
  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    (h.get("x-real-ip") ?? "").trim() ||
    "unknown";
  return createHash("sha256")
    .update((process.env.IP_HASH_SALT ?? "pe-portal") + ip)
    .digest("hex");
}

// ponytail: in-memory fixed-window limiter — per-process, resets on restart.
// Fine for a single instance; move to Redis/DB if you run multiple instances.
const buckets = new Map<string, { count: number; resetAt: number }>();

// ponytail: lazy sweep — drop expired buckets so the Map can't grow unbounded
// (one entry per distinct key would otherwise live forever). Runs at most once
// per interval; worst-case size is the distinct keys seen within one window.
const SWEEP_INTERVAL_MS = 5 * 60_000;
let lastSweep = Date.now();
function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  for (const [key, b] of buckets) if (now > b.resetAt) buckets.delete(key);
  lastSweep = now;
}

/** Returns true if allowed, false if the limit for this key is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}
