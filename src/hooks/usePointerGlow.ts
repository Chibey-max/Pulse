"use client";

import { useEffect } from "react";

/*
  One delegated pointer listener for the whole page. Writes --pointer-x / --pointer-y on
  <html> once per animation frame, which feeds both `.bg-spotlight` and every `.edge-glow`
  border. Mount once, in a route group layout (AmbientBackground owns it) — never per card.
*/
export function usePointerGlow(): void {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const root = document.documentElement;
    let frame = 0;
    let x = 0;
    let y = 0;

    const flush = (): void => {
      frame = 0;
      root.style.setProperty("--pointer-x", `${x}px`);
      root.style.setProperty("--pointer-y", `${y}px`);
    };

    const onMove = (event: PointerEvent): void => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
