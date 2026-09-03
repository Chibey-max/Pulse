import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

// === Types

export interface CardProps {
  children: ReactNode;
  /* Cursor edge-glow border. Use sparingly, on high-intent surfaces only. */
  glow?: boolean;
  /* Add the hover-lift transition (brighter border + lifted shadow on hover). */
  interactive?: boolean;
  as?: ElementType;
  className?: string;
}

// === Component

/*
  The standard panel surface: themed background, consistent radius, and shadow-led
  elevation (a hairline on dark, a soft diffuse shadow on light). Internal padding is
  the caller's to set so a card can be flush (a list) or padded (a stat block).
*/
export function Card({
  children,
  glow = false,
  interactive = false,
  as: Component = "div",
  className,
}: CardProps) {
  return (
    <Component
      className={cn(
        "bg-bg-panel shadow-elevation rounded-lg",
        interactive && "card-rest",
        glow && "edge-glow",
        className,
      )}
    >
      {children}
    </Component>
  );
}
