import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

// === Types

export type SectionPanel = "none" | "tint" | "tint-signal" | "deep";

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
  /*
    Wrap the content in a large rounded surface. `tint` / `tint-signal` are soft brand
    washes; `deep` is a dark band (in both themes) with its text ramp inverted. The panel
    carries its own padding, so `spacing` only governs the gap above and below it.
  */
  panel?: SectionPanel;
  /* Pull the panel up under the previous section so consecutive panels stack and overlap. */
  overlap?: boolean;
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

const PANEL_SURFACE: Record<Exclude<SectionPanel, "none">, string> = {
  tint: "panel-surface",
  "tint-signal": "panel-surface-signal",
  deep: "panel-deep",
};

// The one place the panel's internal padding ladder lives.
const PANEL_PADDING = "px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-20";

// === Component

/*
  The single implementation of the section layout convention. Every top-level section on
  every page goes through this so the rule cannot drift:

    <section relative isolate w-full h-full [background]>
      <div mx-auto w-full max-w-container px-section-px [py-section-py]>
        [optional .panel-* rounded surface]

  `isolate` keeps any negative-z decoration inside this section's own stacking context so
  it cannot fall behind the page's fixed ambient layers and get retinted across themes.
*/
export function Section({
  children,
  id,
  background,
  spacing = "base",
  panel = "none",
  overlap = false,
  decoration,
  labelledBy,
  label,
  fullHeight = false,
  className,
  innerClassName,
  as: Component = "section",
}: SectionProps) {
  const headingId = labelledBy ?? (id ? `${id}-heading` : undefined);
  const hasPanel = panel !== "none";

  const inner = (
    <div
      className={cn(
        "max-w-container px-section-px relative mx-auto w-full",
        // With a panel, the panel owns the vertical rhythm; the section just spaces around it.
        hasPanel ? SPACING[spacing === "none" ? "tight" : spacing] : SPACING[spacing],
        !hasPanel && innerClassName,
      )}
    >
      {hasPanel ? (
        <div
          className={cn(
            "relative z-10",
            PANEL_SURFACE[panel],
            PANEL_PADDING,
            overlap && "-mt-16 sm:-mt-24",
            innerClassName,
          )}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );

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
      {inner}
    </Component>
  );
}
