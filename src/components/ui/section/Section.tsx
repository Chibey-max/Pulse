import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

// === Types

export interface SectionProps {
  children: ReactNode;
  /* Anchor target; also derives the heading id for aria-labelledby (`${id}-heading`). */
  id?: string;
  /*
    Background utilities for the <section> element itself. The section is the only place
    a background belongs, because `relative` on it anchors any absolutely positioned
    decoration and the background then bleeds the full viewport width.
  */
  background?: string;
  /* Vertical rhythm, applied to the inner container so backgrounds still bleed full width. */
  spacing?: "none" | "tight" | "base" | "loose";
  /* Absolutely positioned decoration rendered behind the content, inside the section. */
  decoration?: ReactNode;
  /* id of the heading that labels this section. Falls back to `${id}-heading`. */
  labelledBy?: string;
  /* Use when the section has no visible heading to point at. */
  label?: string;
  /* Fill the viewport. svh so mobile browser chrome does not cause a jump. */
  fullHeight?: boolean;
  className?: string;
  innerClassName?: string;
  as?: ElementType;
}

// === Rhythm

const SPACING: Record<NonNullable<SectionProps["spacing"]>, string> = {
  none: "",
  tight: "py-section-py-tight",
  base: "py-section-py",
  loose: "py-section-py-loose",
};

// === Component

/*
  The single implementation of the section layout convention. Every top-level section on
  every page goes through this so the rule cannot drift:

    <section relative isolate w-full h-full [background]>
      <div mx-auto w-full max-w-container px-section-px [py-section-py]>

  `isolate` keeps any negative-z decoration inside this section's own stacking context so
  it cannot fall behind the page's fixed ambient layers and get retinted across themes.
*/
export function Section({
  children,
  id,
  background,
  spacing = "base",
  decoration,
  labelledBy,
  label,
  fullHeight = false,
  className,
  innerClassName,
  as: Component = "section",
}: SectionProps) {
  const headingId = labelledBy ?? (id ? `${id}-heading` : undefined);

  return (
    <Component
      id={id}
      aria-labelledby={label ? undefined : headingId}
      aria-label={label}
      className={cn(
        "scroll-mt-navbar relative isolate h-full w-full",
        fullHeight && "min-h-svh",
        background,
        className,
      )}
    >
      {decoration}
      <div
        className={cn(
          "max-w-container px-section-px relative mx-auto w-full",
          SPACING[spacing],
          innerClassName,
        )}
      >
        {children}
      </div>
    </Component>
  );
}
