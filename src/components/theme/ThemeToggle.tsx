"use client";

import { useRef } from "react";
import { useTheme } from "next-themes";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/cn";

// === Types

type Mode = "dark" | "light";

// === Helpers

/*
  Flip the class on <html> directly, then tell next-themes, so document.startViewTransition
  below snapshots the real DOM mutation rather than one that lands a tick later.
*/
function applyTheme(next: Mode, setTheme: (value: string) => void): void {
  const root = document.documentElement;
  root.classList.remove(next === "dark" ? "light" : "dark");
  root.classList.add(next);
  setTheme(next);
}

// === Component

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  function handleClick(): void {
    const current: Mode = resolvedTheme === "light" ? "light" : "dark";
    const next: Mode = current === "dark" ? "light" : "dark";

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || prefersReduced) {
      applyTheme(next, setTheme);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const root = document.documentElement;
      root.style.setProperty("--theme-toggle-x", `${rect.left + rect.width / 2}px`);
      root.style.setProperty("--theme-toggle-y", `${rect.top + rect.height / 2}px`);
    }

    document.startViewTransition(() => applyTheme(next, setTheme));
  }

  const isDark = !hydrated || resolvedTheme !== "light";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={!hydrated}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "border-border text-text-secondary hover:border-border-bright hover:text-text-primary inline-flex items-center justify-center rounded-md border p-1.5 transition-colors",
        className,
      )}
    >
      {isDark ? (
        <MdLightMode size={16} aria-hidden="true" />
      ) : (
        <MdDarkMode size={16} aria-hidden="true" />
      )}
    </button>
  );
}
