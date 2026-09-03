"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/cn";

// === Types

export interface CountdownProps {
  /* UTC-anchored unix timestamp (seconds) the window expires at. */
  expiryTs: number;
  /* `hero` is the oversized primary object; `inline` is a compact label. */
  size?: "hero" | "inline";
  className?: string;
}

// === Component

/*
  The countdown as a first-class object. Under a minute it gains a ring and a "less than
  a minute" label so urgency is carried by shape and text, not colour alone.

  Server and first client render both show a stable placeholder; the live tick only
  starts after hydration, so a clock-derived value can never hydration-mismatch.
*/
export function Countdown({ expiryTs, size = "inline", className }: CountdownProps) {
  const hydrated = useHydrated();
  const live = useCountdown(expiryTs);

  const label = hydrated ? (live.expired ? "00:00" : live.label) : "--:--";

  const urgent = hydrated && live.urgent;
  const ticking = hydrated && !live.expired && size === "hero";

  return (
    <span
      role="timer"
      aria-live={urgent ? "assertive" : "off"}
      className={cn(
        "font-mono-numbers inline-block font-mono tabular-nums",
        size === "hero" ? "text-display" : "text-body",
        urgent ? "text-warn" : "text-text-primary",
        urgent && size === "hero" && "ring-warn/50 rounded-lg px-3 ring-2",
        className,
      )}
    >
      {/* keyed on the whole-second value so the heartbeat animation re-fires each tick */}
      <span
        key={ticking ? live.secondsLeft : "steady"}
        className={cn("inline-block", ticking && "countdown-tick")}
      >
        {label}
      </span>
      {urgent ? <span className="sr-only"> (less than a minute remaining)</span> : null}
    </span>
  );
}
