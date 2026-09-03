"use client";

import { DotField } from "@/components/reactbits/DotField";
import { usePointerGlow } from "@/hooks/usePointerGlow";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useScrollProgress } from "@/hooks/useScrollProgress";

// === Types

export interface AmbientBackgroundProps {
  /*
    `full` is the marketing treatment: mesh, grid, dots, and the pointer spotlight at
    full strength. `subtle` is the app treatment: the same vocabulary, lower intensity,
    because an instrument panel should not compete with its own readings.
  */
  variant?: "full" | "subtle";
}

// === Component

/*
  The entire ambient background for a route group, plus the two delegated listeners that
  drive it (pointer and scroll). Mount once, in the route group's layout. Do not mount
  usePointerGlow anywhere else.

  Every layer is CSS except DotField, which is Canvas 2D (not WebGL) and is dropped
  entirely, not merely frozen, under reduced motion.
*/
export function AmbientBackground({ variant = "full" }: AmbientBackgroundProps) {
  const prefersReduced = usePrefersReducedMotion();

  usePointerGlow();
  useScrollProgress();

  const subtle = variant === "subtle";

  return (
    <div aria-hidden="true">
      <div className="bg-mesh" style={{ opacity: subtle ? 0.22 : 0.55 }} />
      <div className="bg-grid" style={{ opacity: subtle ? 0.14 : 0.22 }} />

      {!prefersReduced ? (
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          style={{ opacity: subtle ? 0.4 : 0.85 }}
        >
          <DotField spacing={subtle ? 34 : 30} />
        </div>
      ) : null}

      <div className="bg-spotlight" style={{ opacity: subtle ? 0.5 : 1 }} />
    </div>
  );
}
