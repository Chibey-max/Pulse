"use client";

import { memo, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

// === Types

export interface DotFieldProps {
  /* Grid pitch in px. */
  spacing?: number;
  dotRadius?: number;
  /* Cursor influence radius in px. */
  cursorRadius?: number;
  /* How far dots are pushed out of the cursor's way, 0 to 1. */
  push?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

interface Dot {
  ox: number;
  oy: number;
  x: number;
  y: number;
}

// === Component

/*
  A cursor-reactive dot grid on a Canvas 2D context (no WebGL). Dots ease toward their
  home position and are pushed aside near the pointer. Mounted once by AmbientBackground,
  which does not render it at all under reduced motion, so this file never checks the flag.
*/
export const DotField = memo(function DotField({
  spacing = 30,
  dotRadius = 1.4,
  cursorRadius = 160,
  push = 0.28,
  colorFrom = "rgba(47, 212, 134, 0.4)",
  colorTo = "rgba(77, 208, 225, 0.16)",
  className,
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    const pointer = { x: -9999, y: -9999 };
    let raf = 0;

    const build = (): void => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          dots.push({ ox: x, oy: y, x, y });
        }
      }
    };

    const frame = (): void => {
      ctx.clearRect(0, 0, width, height);
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, colorFrom);
      grad.addColorStop(1, colorTo);
      ctx.fillStyle = grad;

      for (const dot of dots) {
        const dx = dot.ox - pointer.x;
        const dy = dot.oy - pointer.y;
        const dist = Math.hypot(dx, dy);

        let tx = dot.ox;
        let ty = dot.oy;
        if (dist < cursorRadius) {
          const force = (1 - dist / cursorRadius) * push;
          tx += dx * force;
          ty += dy * force;
        }

        dot.x += (tx - dot.x) * 0.12;
        dot.y += (ty - dot.y) * 0.12;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onPointerLeave = (): void => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    build();
    frame();
    window.addEventListener("resize", build);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", build);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("h-full w-full", className)} />;
});
