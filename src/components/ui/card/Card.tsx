import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

// === Types

export interface CardProps {
  children: ReactNode;
  /* Cursor edge-glow border. Use sparingly, on high-intent surfaces only. */
  glow?: boolean;
  as?: ElementType;
  className?: string;
}

// === Component

/*
  The standard panel surface: themed background, hairline border, consistent radius.
  Internal padding is the caller's to set so a card can be flush (a list) or padded
  (a stat block).
*/
export function Card({ children, glow = false, as: Component = "div", className }: CardProps) {
  return (
    <Component
      className={cn("border-border bg-bg-panel rounded-lg border", glow && "edge-glow", className)}
    >
      {children}
    </Component>
  );
}
