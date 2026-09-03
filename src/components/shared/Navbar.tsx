"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { AppLogo } from "@/components/shared/AppLogo";
import { WalletButton } from "@/components/shared/WalletButton";
import { WalletBalance } from "@/components/app";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { APP_NAV } from "@/lib/nav";
import { PULSE_CHAINS } from "@/lib/wagmi";
import { cn } from "@/lib/cn";

// === Component

/*
  App-route header. Sticky (not fixed), token-driven, and the only place the wallet stack
  is referenced in chrome. The bottom hairline doubles as the scroll rail target later.
*/
export function Navbar() {
  const pathname = usePathname();
  const prefersReduced = usePrefersReducedMotion();
  const [scrolled, setScrolled] = useState<boolean>(false);
  const ticking = useRef<boolean>(false);

  useEffect(() => {
    const update = (): void => {
      setScrolled(window.scrollY > 12);
      ticking.current = false;
    };

    const onScroll = (): void => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "border-border sticky top-0 z-40 w-full border-b backdrop-blur-md",
        !prefersReduced && "transition-[background-color,box-shadow] duration-300",
        scrolled ? "bg-bg/95 shadow-nav" : "bg-bg/70",
      )}
    >
      <div className="h-navbar max-w-container px-section-px mx-auto flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center rounded" aria-label="Pulse home">
            <AppLogo variant="full" size="md" />
          </Link>
          <span aria-hidden="true" className="text-border-bright hidden sm:inline">
            |
          </span>
          <span className="text-micro text-text-muted hidden font-mono tracking-wider uppercase sm:inline">
            {PULSE_CHAINS[0].name}
          </span>
        </div>

        <nav aria-label="App" className="hidden items-center gap-6 lg:flex">
          {APP_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "link-underline text-micro hover:text-up rounded font-mono tracking-wider uppercase transition-colors",
                  active ? "text-text-primary" : "text-text-secondary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="rounded-pill" />
          <WalletBalance />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
