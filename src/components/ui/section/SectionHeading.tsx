import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// === Types

export interface SectionHeadingProps {
  /* Must match the owning Section's `id` so aria-labelledby resolves here. */
  id: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  /* h1 for the hero, h2 everywhere else. Never skip a level for styling. */
  as?: "h1" | "h2";
  className?: string;
}

// === Component

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-3",
        align === "center" && "mx-auto items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-micro text-signal font-mono font-medium tracking-[0.2em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <Heading
        id={`${id}-heading`}
        className={cn(
          "font-display text-text-primary font-semibold text-balance",
          Heading === "h1" ? "text-h1" : "text-h2",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className="text-lead text-text-secondary text-pretty">{description}</p>
      ) : null}
    </div>
  );
}
