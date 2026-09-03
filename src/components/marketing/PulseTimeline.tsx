"use client";

import {
  MdArrowForward,
  MdBolt,
  MdCheckCircle,
  MdLock,
  MdNotificationsActive,
  MdRepeat,
} from "react-icons/md";
import { motion } from "motion/react";
import { Reveal, Section, SectionHeading } from "@/components/ui";
import { EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

// === Data

interface Step {
  key: string;
  label: string;
  detail: string;
  icon: typeof MdBolt;
  /* The climax: the redemption the user never signs. */
  climax?: boolean;
}

const STEPS: readonly Step[] = [
  {
    key: "call",
    label: "Call",
    detail: "One tap on Up or Down before the clock hits zero.",
    icon: MdBolt,
  },
  {
    key: "lock",
    label: "Lock",
    detail: "The window stops taking orders. Residuals can still be cancelled.",
    icon: MdLock,
  },
  {
    key: "resolve",
    label: "Resolve",
    detail: "The market settles onchain. You do nothing.",
    icon: MdNotificationsActive,
  },
  {
    key: "redeem",
    label: "Redeem",
    detail:
      "Validators invoke your session handler and credit the winnings. No signature required.",
    icon: MdCheckCircle,
    climax: true,
  },
  {
    key: "roll",
    label: "Roll",
    detail: "If autopilot is armed and within policy, the next window's call is placed.",
    icon: MdRepeat,
  },
];

// Redeem is the 4th of 5 nodes; its column centre sits at ~70% across the rail.
const CLIMAX_POSITION = 0.7;

// === Rail

/*
  The signature device. On desktop a settlement pulse travels the rail left to right and
  swells as it passes the Redeem node, because the no-signature redemption is the moment
  the whole product turns on. Hidden entirely under reduced motion; the cards still carry
  the sequence on their own.
*/
function Rail() {
  const prefersReduced = usePrefersReducedMotion();
  if (prefersReduced) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-8 top-9 hidden lg:block"
    >
      <div className="bg-border relative h-px w-full">
        <motion.div
          className="from-up via-signal to-signal absolute inset-y-0 left-0 origin-left bg-gradient-to-r"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.4, ease: EASE_OUT }}
        />
        <motion.span
          className="bg-signal absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full shadow-[0_0_16px_var(--color-signal)]"
          initial={{ left: "0%", scale: 0, opacity: 0 }}
          whileInView={{
            left: ["0%", `${CLIMAX_POSITION * 100}%`, "100%"],
            scale: [0.6, 1.6, 0.9],
            opacity: [0, 1, 0.9],
          }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.6, ease: EASE_OUT, times: [0, 0.62, 1] }}
        />
      </div>
    </div>
  );
}

// === Component

export function PulseTimeline() {
  return (
    <Section id="how-it-works" background="border-t border-border">
      <div className="flex flex-col gap-10">
        <SectionHeading
          id="how-it-works"
          eyebrow="How it works"
          title="One continuous session, not a sequence of chores"
          description="A window resolves every 15 minutes. Pulse makes the run behave like one session that pays you as it goes."
        />

        <div className="relative">
          <Rail />
          <Reveal stagger className="grid gap-3 lg:grid-cols-5">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal child key={step.key}>
                  <div
                    className={cn(
                      "flex h-full flex-col gap-3 rounded-lg border p-4",
                      step.climax
                        ? "border-signal/50 bg-signal/8 shadow-[0_0_24px_-8px_var(--color-signal)]"
                        : "border-border bg-bg-panel",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-md",
                            step.climax
                              ? "bg-signal/15 text-signal"
                              : "bg-bg-elevated text-text-secondary",
                          )}
                        >
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                          0{index + 1}
                        </span>
                      </div>
                      {index < STEPS.length - 1 ? (
                        <MdArrowForward
                          size={14}
                          aria-hidden="true"
                          className="text-border-bright hidden lg:block"
                        />
                      ) : null}
                    </div>
                    <h3 className="font-display text-h3 text-text-primary font-semibold">
                      {step.label}
                    </h3>
                    <p className="text-caption text-text-secondary">{step.detail}</p>
                  </div>
                </Reveal>
              );
            })}
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
