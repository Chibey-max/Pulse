import type { Variants } from "motion/react";
import {
  DURATION,
  EASE_LUXE,
  EASE_OUT,
  transitionFast,
  transitionReveal,
  transitionSpring,
} from "./transitions";

/*
  The animation vocabulary. Import these where they are used rather than redeclaring
  `initial` / `animate` objects per component:

    import { revealUp, staggerParent } from "@/lib/motion";
*/

// === Entrances

/*
  The default content entrance: rise, fade, and pull into focus. The small blur is what
  reads as "premium" rather than "a div appeared" — it mimics a camera settling.
*/
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: transitionReveal },
  exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: transitionFast },
};

/* Alias kept so existing call sites do not churn. */
export const fadeUp = revealUp;

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE_LUXE } },
  exit: { opacity: 0, transition: transitionFast },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, filter: "blur(6px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)", transition: transitionSpring },
  exit: { opacity: 0, scale: 0.96, transition: transitionFast },
};

/* App panels mounting: a shorter, tighter version of revealUp for dense screens. */
export const panelIn: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.base, ease: EASE_LUXE },
  },
};

// === Orchestration

/*
  Parent for a staggered group. Pair with `revealUp` (or `panelIn`) on each child. This
  is the "cards come up one after the other" behaviour.
*/
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } },
};

/* Tighter cascade for dense app screens. */
export const staggerTight: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
};

// === Lists

/* Rows arriving from a poll: activity tape, order book updates. */
export const listItem: Variants = {
  hidden: { opacity: 0, x: -10, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
  exit: { opacity: 0, x: 10, transition: transitionFast },
};

// === Accordion

/* FAQ answer reveal, paired with a grid-rows [0fr] -> [1fr] transition on the wrapper. */
export const accordionRow: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_LUXE } },
  exit: { opacity: 0, y: -6, transition: transitionFast },
};
