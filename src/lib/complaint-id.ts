import type { Prisma } from "@prisma/client";

/** "DDMMYYYY" in Asia/Kolkata, independent of server timezone. */
export function istDateKey(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("day")}${get("month")}${get("year")}`;
}

/** PE + DDMMYYYY + per-day sequence (2-digit padded, grows past 99). Call inside a transaction. */
export async function nextComplaintId(tx: Prisma.TransactionClient): Promise<string> {
  const dateKey = istDateKey();
  const counter = await tx.dailyCounter.upsert({
    where: { date: dateKey },
    create: { date: dateKey, counter: 1 },
    update: { counter: { increment: 1 } },
  });
  return `PE${dateKey}${String(counter.counter).padStart(2, "0")}`;
}
