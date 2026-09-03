import { cn } from "@/lib/cn";

// === Types

export type CtaVariant = "primary" | "secondary";
export type CtaSize = "sm" | "md" | "lg";

export interface CtaStyleProps {
  variant: CtaVariant;
  size?: CtaSize;
  className?: string;
}

// === Style maps

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-pill font-medium " +
  "transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out " +
  "will-change-transform active:scale-[0.97] motion-reduce:active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-55";

const VARIANT: Record<CtaVariant, string> = {
  /* One per view. Filled Up-green, a cursor edge glow, and a soft lift on hover. */
  primary:
    "edge-glow bg-up text-on-up shadow-[0_0_0_0_transparent] hover:bg-up-dim hover:-translate-y-px hover:shadow-[0_10px_28px_-10px_color-mix(in_srgb,var(--color-up)_60%,transparent)]",
  secondary:
    "border border-border-bright bg-transparent text-text-primary hover:-translate-y-px hover:border-text-muted hover:bg-bg-hover",
};

const SIZE: Record<CtaSize, string> = {
  sm: "h-9 px-4 text-caption",
  md: "h-11 px-5 text-body",
  lg: "h-12 px-6 text-body",
};

// === Builder

/*
  Shared by CtaButton and CtaLink so a <button> and an <a> that read as the same control
  can never drift apart.
*/
export function ctaClasses({ variant, size = "md", className }: CtaStyleProps): string {
  return cn(BASE, VARIANT[variant], SIZE[size], className);
}
