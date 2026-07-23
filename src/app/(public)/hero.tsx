"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

// Parallax hero imported from Claude Design "solar-hero". Ported the design's
// vanilla-JS pointer/idle parallax into an effect with proper cleanup.
export default function SolarHero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const layers = Array.from(hero.querySelectorAll<HTMLElement>("[data-depth]"));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      t = 0,
      raf = 0;
    let hovering = false;

    const onMove = (e: MouseEvent) => {
      hovering = true;
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 1;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 1;
    };
    const onLeave = () => {
      hovering = false;
    };
    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);

    const loop = () => {
      t += 0.008;
      if (!hovering && !reduce) {
        tx = Math.sin(t) * 0.28;
        ty = Math.cos(t * 0.8) * 0.2;
      }
      if (reduce) {
        tx = 0;
        ty = 0;
      }
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      for (const el of layers) {
        const d = Number(el.dataset.depth);
        el.style.transform = `translate(${-cx * d}px, ${-cy * d}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <section className="hero" ref={heroRef} aria-label="Solar module support">
      <div className="hero__bg" data-depth="90" />
      <div className="hero__scrim" />
      <div className="hero__copy" data-depth="18">
        <span className="hero__eyebrow">Premier Energies · Solar Modules</span>
        <h1 className="hero__title">Solar Module Support</h1>
        <p className="hero__lede">
          Report a defect in your solar modules and follow every step from
          submission to resolution.
        </p>
        <div className="hero__actions">
          <Link href="/complaint/new" className="btn btn--primary">
            Raise a complaint
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h13" />
              <path d="m12 6 6 6-6 6" />
            </svg>
          </Link>
          <Link href="/track" className="btn btn--ghost">
            Track a complaint
          </Link>
        </div>
      </div>
      <div className="hero__footer">
        <p>© {new Date().getFullYear()} Premier Energies Limited, Hyderabad, India.</p>
        <p>After-sales support for solar PV modules.</p>
      </div>
    </section>
  );
}
