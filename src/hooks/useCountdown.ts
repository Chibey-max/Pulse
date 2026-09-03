"use client";

import { useEffect, useState } from "react";

// === Types

export interface Countdown {
  /* Whole seconds remaining, floored at 0. */
  secondsLeft: number;
  /* "mm:ss", or "hh:mm:ss" past an hour. */
  label: string;
  /* True in the final minute: drive shape and label changes, not colour alone. */
  urgent: boolean;
  /* True once the target has passed. */
  expired: boolean;
}

// === Helper

function format(totalSeconds: number): string {
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// === Hook

/*
  Countdown to a UTC-anchored unix timestamp (seconds). Ticks once per second and stops
  at zero. `expiryTs` is the market's own expiry from chain, so every client shows the
  same number regardless of local clock display.
*/
export function useCountdown(expiryTs: number): Countdown {
  const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const secondsLeft = Math.max(0, expiryTs - now);

  return {
    secondsLeft,
    label: format(secondsLeft),
    urgent: secondsLeft > 0 && secondsLeft <= 60,
    expired: secondsLeft === 0,
  };
}
