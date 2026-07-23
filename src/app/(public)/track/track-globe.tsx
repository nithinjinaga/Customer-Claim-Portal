"use client";

// Decorative globe for the track page. Lazy-loaded (kept out of the lookup's
// critical path), and only mounted on wide viewports without reduced-motion so
// it never costs low-end / bad-network users anything.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Globe3DDemo = dynamic(() => import("@/components/3d-globe-demo"), {
  ssr: false, // Canvas/WebGL can't server-render
});

export default function TrackGlobe() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const wide = window.matchMedia?.("(min-width: 1024px)").matches ?? false;
    setShow(wide && !reduce);
  }, []);

  if (!show) return null;

  return (
    <div aria-hidden className="lg:sticky lg:top-24">
      <Globe3DDemo />
      <p className="mt-2 text-center text-xs text-muted">
        Premier Energies solar modules, supported across our markets worldwide.
      </p>
    </div>
  );
}
