import type { Transition } from "motion/react";

/*
  One motion system for the whole app. Declaring transitions inline per component is what
  produces a UI where every section eases slightly differently. Two registers:

    - content entrances: soft springs, a hint of blur-to-focus, generous but never slow
    - live data + micro-interactions: short, decisive, no bounce (bounce on a price reads
      as lag, not polish)
*/

// === Easing

/* GSAP power3.out — kept so a later GSAP addition feels like the same system. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/* A softer settle for large surfaces sliding into place. */
export const EASE_LUXE = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

// === Duration

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.34,
  slow: 0.6,
} as const;

// === Transitions

export const transitionBase: Transition = {
  duration: DURATION.base,
  ease: EASE_LUXE,
};

export const transitionFast: Transition = {
  duration: DURATION.fast,
  ease: EASE_OUT,
};

/* Content entrances: settles without a visible overshoot. */
export const transitionReveal: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 24,
  mass: 0.9,
};

/* Micro-interactions (chips, toggles, small panels): a touch of life. */
export const transitionSpring: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
};

// === Reduced motion

/*
  Collapse any transition to zero. Components read the flag from usePrefersReducedMotion
  and pass it here rather than branching at every call site.
*/
export function withReducedMotion(transition: Transition, prefersReduced: boolean): Transition {
  if (!prefersReduced) return transition;
  return { ...transition, duration: 0, delay: 0 };
}
