"use client";

import type { ReactNode } from "react";
import { type Variants, motion } from "motion/react";
import { revealUp, staggerParent, staggerTight } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// === Types

export interface RevealProps {
  children: ReactNode;
  /* Variants for this element. Defaults to the rise-fade-focus entrance. */
  variants?: Variants;
  /* Wrap in a stagger parent so direct <Reveal child> children cascade one after another. */
  stagger?: boolean;
  /* With `stagger`, use the tighter cadence (dense app screens). */
  tight?: boolean;
  /*
    Mark this as a stagger child: it is driven by an ancestor stagger parent and does not
    trigger on its own viewport. Without this, nested Reveals each fire independently and
    never cascade.
  */
  child?: boolean;
  /* Fraction of the element visible before it triggers (parents only). */
  amount?: number;
  className?: string;
}

// === Component

/*
  Scroll-into-view entrance, always a <div>. The "cards come up one after the other"
  pattern is `<Reveal stagger>` wrapping several `<Reveal child>`. Reduced motion renders
  a plain div with no animation.
*/
export function Reveal({
  children,
  variants,
  stagger = false,
  tight = false,
  child = false,
  amount = 0.25,
  className,
}: RevealProps) {
  const prefersReduced = usePrefersReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const resolved = variants ?? (stagger ? (tight ? staggerTight : staggerParent) : revealUp);

  if (child) {
    return (
      <motion.div className={className} variants={variants ?? revealUp}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      variants={resolved}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}
