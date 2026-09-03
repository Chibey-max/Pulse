import Image from "next/image";
import { cn } from "@/lib/cn";

// === Types

export interface AppLogoProps {
  /* `mark` is the glyph alone; `full` adds the wordmark beside it. */
  variant?: "mark" | "full";
  /* Rendered height of the glyph; the wordmark scales alongside it. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

// === Sizing

const MARK_PX: Record<NonNullable<AppLogoProps["size"]>, number> = {
  sm: 16,
  md: 20,
  lg: 28,
};

const WORD_SIZE: Record<NonNullable<AppLogoProps["size"]>, string> = {
  sm: "text-micro",
  md: "text-caption",
  lg: "text-body",
};

// === Component

/*
  The brand mark (public/logo-mark.png, cropped and alpha-keyed from the source asset)
  paired with the wordmark as themeable text, so the lockup adapts to the light and dark
  chrome without a second image. One aria-hidden visual with the name in a sibling
  sr-only span, so a screen reader hears "Pulse" once.
*/
export function AppLogo({ variant = "full", size = "md", className }: AppLogoProps) {
  const px = MARK_PX[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo-mark.png"
        alt=""
        aria-hidden="true"
        width={px}
        height={Math.round(px * 0.865)}
        priority
        className="w-auto shrink-0"
        style={{ height: px }}
      />
      {variant === "full" ? (
        <span
          aria-hidden="true"
          className={cn(
            "tracking-logo text-text-primary font-mono leading-none font-bold uppercase",
            WORD_SIZE[size],
          )}
        >
          Pulse
        </span>
      ) : null}
      <span className="sr-only">Pulse</span>
    </span>
  );
}
