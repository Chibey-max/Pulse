"use client";

import { useTheme } from "next-themes";
import { DotField } from "@/components/reactbits/DotField";
import { useHydrated } from "@/hooks/useHydrated";
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

  Dark keeps the full vocabulary (mesh, grid, Canvas 2D dots, spotlight). Light drops all
  of it for a single soft diagonal wash plus a faint pointer spotlight, because the dot
  field and engineering grid read as noise against the soft light palette.

  Every layer is CSS except DotField, which is Canvas 2D (not WebGL) and is dropped
  entirely, not merely frozen, under reduced motion.
*/
export function AmbientBackground({ variant = "full" }: AmbientBackgroundProps) {
  const prefersReduced: boolean = usePrefersReducedMotion();
  const hydrated: boolean = useHydrated();
  const { resolvedTheme } = useTheme();

  // Delegated listeners feed global CSS vars; run them regardless of theme.
  usePointerGlow();
  useScrollProgress();

  // Unhydrated renders match the default theme (dark) to keep SSR and first client render in sync.
  const isLight: boolean = hydrated && resolvedTheme === "light";
  const subtle: boolean = variant === "subtle";

  if (isLight) {
    return (
      <div aria-hidden="true">
        <div className="bg-beam" aria-hidden="true" />
        <div className="bg-spotlight" style={{ opacity: subtle ? 0.25 : 0.4 }} />
      </div>
    );
  }

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
