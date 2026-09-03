"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MdMenu, MdClose } from "react-icons/md";
import { AnimatePresence, motion } from "motion/react";
import { AppLogo } from "@/components/shared/AppLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CtaLink } from "@/components/ui";
import { MARKETING_NAV } from "@/lib/nav";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/cn";

// === Component

/*
  Marketing-route navigation. Deliberately imports no wagmi/wallet code: the landing page
  must not ship the wallet stack. The only wallet-adjacent affordance is the link to
  /app, where connection happens.

  Floating pill, always `position: fixed` (never `sticky`, which would reserve layout box
  and push the hero down). Hides on scroll-down, returns on scroll-up.
*/
export function NavigationBar() {
  const [open, setOpen] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(true);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const lastY = useRef<number>(0);
  const ticking = useRef<boolean>(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    lastY.current = window.scrollY;

    const update = (): void => {
      const y = window.scrollY;
      if (y < 80) setVisible(true);
      else if (y > lastY.current) setVisible(false);
      else setVisible(true);
      setScrolled(y > 12);
      lastY.current = y;
      ticking.current = false;
    };

    const onScroll = (): void => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div
      className="fixed top-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-5xl flex-col gap-2 sm:w-[calc(100%-4rem)]"
      style={{
        transform: `translateX(-50%) translateY(${visible ? 0 : -32}px)`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: prefersReduced
          ? "none"
          : "transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div
        className={cn(
          "rounded-pill border-border-bright flex w-full items-center justify-between gap-3 border px-4 backdrop-blur-md lg:px-6",
          !prefersReduced && "transition-[height,background-color,box-shadow] duration-300",
          scrolled ? "bg-bg-panel/95 h-13 shadow-xl" : "bg-bg-panel/90 shadow-nav h-14",
        )}
      >
        <Link href="/" className="rounded-pill flex items-center" aria-label="Pulse home">
          <AppLogo variant="full" size="md" />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {MARKETING_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="link-underline text-micro text-text-secondary hover:text-up rounded font-mono tracking-wider uppercase transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="rounded-pill" />
          <CtaLink variant="primary" size="sm" href="/app" className="hidden sm:inline-flex">
            Open app
          </CtaLink>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="border-border text-text-secondary hover:border-border-bright hover:text-text-primary rounded-md border p-1.5 transition-colors lg:hidden"
          >
            {open ? (
              <MdClose size={16} aria-hidden="true" />
            ) : (
              <MdMenu size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: prefersReduced ? 0 : DURATION.base, ease: EASE_OUT }}
            className="border-border-bright bg-bg-panel/95 shadow-nav overflow-hidden rounded-2xl border backdrop-blur-md lg:hidden"
          >
            <nav aria-label="Mobile" className="p-2">
              <ul className="flex flex-col gap-1">
                {MARKETING_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="text-caption text-text-secondary hover:bg-bg-elevated hover:text-up block rounded-xl px-3 py-2.5 font-mono tracking-wider uppercase transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="p-1">
                  <CtaLink
                    variant="primary"
                    size="sm"
                    href="/app"
                    onClick={() => setOpen(false)}
                    className="w-full"
                  >
                    Open app
                  </CtaLink>
                </li>
              </ul>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
