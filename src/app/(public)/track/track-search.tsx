"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, btnPrimary } from "@/components/ui";

// Soft-navigates (router.push) instead of a native form GET, so the track
// layout — and its globe — stay mounted while the status data is fetched.
export default function TrackSearch({ defaultId }: { defaultId: string }) {
  const router = useRouter();
  const [id, setId] = useState(defaultId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = id.trim().toUpperCase();
        if (v) router.push(`/track?id=${encodeURIComponent(v)}`);
      }}
      className="mt-4 flex gap-2"
    >
      <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        required
        placeholder="Complaint ID, e.g. PE1707202601"
        className={`${inputCls} tnum uppercase`}
        aria-label="Complaint ID"
      />
      <button type="submit" className={btnPrimary}>
        Track
      </button>
    </form>
  );
}
