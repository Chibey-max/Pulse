"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// === Types

export interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /* Peak tilt in degrees at the corners. */
  max?: number;
  disabled?: boolean;
}

// === Helpers

function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

// === Component

/*
  Writes --tilt-x / --tilt-y on a `.tilt-surface` from pointer position, coalesced with
  rAF, and resets to 0 on leave. No-op plain div when disabled, reduced motion, or a
  coarse pointer (touch), where a hover tilt makes no sense.
*/
export function TiltCard({ children, className, max = 5, disabled = false }: TiltCardProps) {
  const prefersReduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number>(0);

  const inert = disabled || prefersReduced || isCoarsePointer();

  useEffect(() => {
    if (inert) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (event: PointerEvent): void => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty("--tilt-y", `${(px * 2 * max).toFixed(2)}deg`);
        el.style.setProperty("--tilt-x", `${(-py * 2 * max).toFixed(2)}deg`);
      });
    };

    const onLeave = (): void => {
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [inert, max]);

  if (inert) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={cn("tilt-surface", className)}>
      {children}
    </div>
  );
}
