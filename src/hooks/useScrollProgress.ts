"use client";

import { useEffect } from "react";

/*
  Writes --scroll-progress (0 to 1) and --scroll-y (px) on <html> once per frame from one
  coalesced listener. `.bg-grid` reads --scroll-y for parallax; a header rail can read
  --scroll-progress. scaleX a pre-painted bar with it, never animate width.
*/
export function useScrollProgress(): void {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const flush = (): void => {
      frame = 0;
      const max = root.scrollHeight - root.clientHeight;
      const y = window.scrollY;
      root.style.setProperty("--scroll-y", `${y}`);
      root.style.setProperty("--scroll-progress", max > 0 ? `${Math.min(1, y / max)}` : "0");
    };

    const onScroll = (): void => {
      if (!frame) frame = requestAnimationFrame(flush);
    };

    flush();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
