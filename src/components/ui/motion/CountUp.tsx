"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// === Types

export interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

// === Component

const EASE = [...EASE_OUT] as [number, number, number, number];

/*
  Animates from the previously displayed number to the current `value` on mount and on
  every change. Reduced motion renders the final value immediately with no tween.
*/
export function CountUp({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const prefersReduced = usePrefersReducedMotion();
  const previous = useRef<number>(value);
  const [display, setDisplay] = useState<number>(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;

    if (prefersReduced || from === value) return;

    const controls = animate(from, value, {
      duration: DURATION.slow,
      ease: EASE,
      onUpdate: (latest: number): void => setDisplay(latest),
    });

    return () => controls.stop();
  }, [value, prefersReduced]);

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const shown = prefersReduced ? value : display;

  return (
    <span className={className}>
      {prefix}
      {formatter.format(shown)}
      {suffix}
    </span>
  );
}
