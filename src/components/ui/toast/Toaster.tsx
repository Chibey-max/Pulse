"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "motion/react";
import {
  MdCheckCircle,
  MdErrorOutline,
  MdHourglassEmpty,
  MdInfoOutline,
  MdNorthEast,
} from "react-icons/md";
import { useHydrated } from "@/hooks/useHydrated";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useToast, useToasts } from "./store";
import type { Toast, ToastVariant } from "./types";

// === Config

const VARIANT_STYLE: Record<ToastVariant, { accent: string; icon: typeof MdInfoOutline }> = {
  pending: { accent: "text-signal", icon: MdHourglassEmpty },
  success: { accent: "text-up", icon: MdCheckCircle },
  error: { accent: "text-down", icon: MdErrorOutline },
  info: { accent: "text-signal", icon: MdInfoOutline },
};

// === Motion

const toastMotion: Variants = {
  hidden: { opacity: 0, x: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: DURATION.fast, ease: EASE_OUT },
  },
  exit: { opacity: 0, x: 24, scale: 0.98, transition: { duration: DURATION.instant } },
};

const reducedMotion: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

// === Item

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const prefersReduced = usePrefersReducedMotion();
  const { accent, icon: Icon } = VARIANT_STYLE[toast.variant];

  return (
    <motion.li
      layout
      variants={prefersReduced ? reducedMotion : toastMotion}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="border-border-bright bg-bg-panel pointer-events-auto flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border p-3.5 shadow-lg"
      role="status"
    >
      <Icon size={16} aria-hidden="true" className={cn("mt-0.5 shrink-0", accent)} />
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-caption text-text-primary font-medium">{toast.title}</span>
        {toast.description ? (
          <span className="text-micro text-text-secondary font-mono">{toast.description}</span>
        ) : null}
        {toast.action ? (
          <a
            href={toast.action.href}
            target={isExternal(toast.action.href) ? "_blank" : undefined}
            rel={isExternal(toast.action.href) ? "noreferrer" : undefined}
            className={cn(
              "text-micro inline-flex items-center gap-1 font-mono tracking-wider uppercase",
              accent,
            )}
          >
            {toast.action.label}
            {isExternal(toast.action.href) ? <MdNorthEast size={11} aria-hidden="true" /> : null}
          </a>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="text-text-muted hover:text-text-primary text-micro shrink-0 font-mono transition-colors"
      >
        ✕
      </button>
    </motion.li>
  );
}

// === Toaster

/*
  One mounted component, rendered once by Providers. Portals a bottom-right stack to
  <body> so it escapes any transformed or clipped ancestor. State lives in the toast
  store, not here.
*/
export function Toaster() {
  const toasts = useToasts();
  const { dismiss } = useToast();
  const hydrated = useHydrated();

  if (!hydrated) return null;

  return createPortal(
    <ul
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </ul>,
    document.body,
  );
}
