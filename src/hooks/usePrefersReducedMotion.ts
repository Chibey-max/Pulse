"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/* Server has no media query; assume motion is allowed and let the client correct it. */
function getServerSnapshot(): boolean {
  return false;
}

/*
  Components use this to skip starting rAF loops and to pass the flag into
  `withReducedMotion` from the motion presets. useSyncExternalStore keeps it SSR-safe
  with no setState-in-effect.
*/
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* Non-hook read for imperative code paths (canvas loops, event handlers). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}
