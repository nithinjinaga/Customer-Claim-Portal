"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, btnGhost } from "@/components/ui";

// Soft-navigation unlock form (keeps the layout/globe mounted, like TrackSearch).
export default function UnlockForm({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const [k, setK] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = k.trim();
        if (v)
          router.push(
            `/track?id=${encodeURIComponent(complaintId)}&k=${encodeURIComponent(v)}`,
          );
      }}
      className="mt-3 flex gap-2"
    >
      <input
        value={k}
        onChange={(e) => setK(e.target.value)}
        required
        placeholder="Email or mobile number"
        className={inputCls}
        aria-label="Email or mobile number used to file"
      />
      <button type="submit" className={btnGhost}>
        Unlock
      </button>
    </form>
  );
}
